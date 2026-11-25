import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * PATCH /api/team/org/coordinator/update
 * Permet au Senior Manager principal (SM1 / Initiateur) de modifier le segment et la zone
 * d'un Coordinateur (Senior Manager) de son organisation, avec propagation en cascade
 * à ses Superviseurs (TMs), commerciaux et fiches de pipeline.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    // 1. Authentification
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    }

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Session expirée ou token invalide' }, { status: 401 })
    }

    // 2. Vérification des droits SM1
    const callerDoc = await adminDb.collection('users').doc(callerUid).get()
    const callerData = callerDoc.data()

    if (!hasActivePaidManagerAccess(callerData) || callerData?.orgRole !== 'senior_manager') {
      return NextResponse.json(
        { message: 'Action strictement réservée au Senior Manager avec abonnement actif' },
        { status: 403 }
      )
    }

    const orgCode = callerData.orgCode as string | undefined
    if (!orgCode) {
      return NextResponse.json(
        { message: 'Aucun code organisation associé à votre compte' },
        { status: 400 }
      )
    }

    const orgDoc = await adminDb.collection('organisations').doc(orgCode).get()
    const primarySmUid = orgDoc.exists ? orgDoc.data()?.seniorManagerUid : null

    const isPrimarySeniorManager =
      callerData.isPrimarySeniorManager !== false &&
      !Boolean(callerData.invitedByUid) &&
      (!primarySmUid || primarySmUid === callerUid)

    if (!isPrimarySeniorManager) {
      return NextResponse.json(
        { message: 'Seul le Coordinateur principal (initiateur de l’organisation) peut modifier le profil d’un Coordinateur.' },
        { status: 403 }
      )
    }

    // 3. Validation du corps de requête
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps de requête JSON invalide' }, { status: 400 })
    }

    const { coordinatorUid, newSegment, newZone } = body as {
      coordinatorUid?: string
      newSegment?: string
      newZone?: string
    }

    if (!coordinatorUid || typeof coordinatorUid !== 'string') {
      return NextResponse.json({ message: 'L’identifiant du coordinateur est requis' }, { status: 400 })
    }

    if (!newSegment || !newSegment.trim()) {
      return NextResponse.json({ message: 'Le nouveau nom de segment est requis' }, { status: 400 })
    }

    const targetUserDoc = await adminDb.collection('users').doc(coordinatorUid).get()
    if (!targetUserDoc.exists) {
      return NextResponse.json({ message: 'Coordinateur introuvable' }, { status: 404 })
    }

    const targetData = targetUserDoc.data() || {}
    if (targetData.orgCode !== orgCode || targetData.orgRole !== 'senior_manager') {
      return NextResponse.json(
        { message: 'L’utilisateur ciblé n’est pas un Coordinateur de votre organisation' },
        { status: 400 }
      )
    }

    const newSegmentTrimmed = newSegment.trim().toUpperCase()
    const newZoneTrimmed = typeof newZone === 'string' ? newZone.trim() : (targetData.zone || '')
    const displaySegment = newZoneTrimmed ? `${newSegmentTrimmed} (${newZoneTrimmed})` : newSegmentTrimmed
    const oldSegment = targetData.segment ? String(targetData.segment).trim() : null

    const now = new Date()
    const { FieldValue } = await import('firebase-admin/firestore')

    // 4. Mettre à jour le profil du Coordinateur cible
    await adminDb.collection('users').doc(coordinatorUid).update({
      segment: newSegmentTrimmed,
      zone: newZoneTrimmed || null,
      displaySegment,
      updatedAt: now
    })

    // Synchroniser Custom Claims auth pour le Coordinateur
    try {
      await adminAuth.setCustomUserClaims(coordinatorUid, {
        role: 'manager',
        orgRole: 'senior_manager',
        orgCode,
        segment: newSegmentTrimmed
      })
    } catch (claimErr) {
      console.warn('[PATCH /api/team/org/coordinator/update] Auth claims sync warning:', claimErr)
    }

    // 5. Propagation aux Superviseurs (TMs) rattachés à ce Coordinateur et leurs membres
    let subordinateCount = 0
    try {
      const subordinateTmsSnap = await adminDb
        .collection('users')
        .where('orgCode', '==', orgCode)
        .where('seniorManagerUid', '==', coordinatorUid)
        .get()

      const tmUids = subordinateTmsSnap.docs.map((d) => d.id)
      const userDocsToUpdate = new Map<string, FirebaseFirestore.DocumentReference>()

      subordinateTmsSnap.docs.forEach((d) => {
        userDocsToUpdate.set(d.id, d.ref)
      })

      // Récupérer les membres rattachés à ces TMs
      if (tmUids.length > 0) {
        for (let i = 0; i < tmUids.length; i += 10) {
          const chunk = tmUids.slice(i, i + 10)
          const membersSnap = await adminDb
            .collection('users')
            .where('orgCode', '==', orgCode)
            .where('managerUid', 'in', chunk)
            .get()
          membersSnap.docs.forEach((d) => userDocsToUpdate.set(d.id, d.ref))
        }
      }

      // Appliquer les batches de mise à jour sur les utilisateurs subordonnés
      if (userDocsToUpdate.size > 0) {
        const userBatch = adminDb.batch()
        userDocsToUpdate.forEach((ref) => {
          userBatch.update(ref, {
            segment: newSegmentTrimmed,
            displaySegment,
            updatedAt: now
          })
        })
        await userBatch.commit()
        subordinateCount = userDocsToUpdate.size
      }
    } catch (subErr) {
      console.warn('[PATCH /api/team/org/coordinator/update] Subordinates propagation warning:', subErr)
    }

    // 6. Propagation aux fiches pipeline du Coordinateur et de ses TMs
    let pipelineCount = 0
    try {
      const managerUidsToQuery = [coordinatorUid]
      const subordinateTmsSnap = await adminDb
        .collection('users')
        .where('orgCode', '==', orgCode)
        .where('seniorManagerUid', '==', coordinatorUid)
        .get()
      subordinateTmsSnap.docs.forEach((d) => managerUidsToQuery.push(d.id))

      for (let i = 0; i < managerUidsToQuery.length; i += 10) {
        const chunk = managerUidsToQuery.slice(i, i + 10)
        const pipelineSnap = await adminDb
          .collection('pipeline')
          .where('managerUid', 'in', chunk)
          .get()

        if (!pipelineSnap.empty) {
          const pBatch = adminDb.batch()
          pipelineSnap.docs.forEach((pDoc) => {
            pBatch.update(pDoc.ref, {
              segment: newSegmentTrimmed,
              displaySegment,
              updatedAt: now
            })
          })
          await pBatch.commit()
          pipelineCount += pipelineSnap.size
        }
      }
    } catch (pErr) {
      console.warn('[PATCH /api/team/org/coordinator/update] Pipeline propagation warning:', pErr)
    }

    // Signal temps réel organisation
    try {
      await adminDb.collection('organisations').doc(orgCode).update({
        lastPipelineUpdate: FieldValue.serverTimestamp()
      })
    } catch (orgErr) {
      console.warn('[PATCH /api/team/org/coordinator/update] Org heartbeat update warning:', orgErr)
    }

    return NextResponse.json({
      success: true,
      message: `Segment du Coordinateur mis à jour : ${displaySegment}`,
      coordinator: {
        uid: coordinatorUid,
        name: targetData.displayName || targetData.name || targetData.email,
        segment: newSegmentTrimmed,
        zone: newZoneTrimmed || null,
        displaySegment
      },
      updatedCount: {
        subordinates: subordinateCount,
        pipeline: pipelineCount
      }
    })
  } catch (error: any) {
    console.error('[PATCH /api/team/org/coordinator/update] error:', error)
    return NextResponse.json({ message: error.message || 'Erreur interne' }, { status: 500 })
  }
}
