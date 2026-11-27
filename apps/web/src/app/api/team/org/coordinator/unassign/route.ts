import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/team/org/coordinator/unassign
 * Permet au Coordinateur principal (SM1) de retirer un Coordinateur de sa zone titulaire
 * sans supprimer son compte ni perdre aucune donnée d'équipe/pipeline.
 * Optionnellement, la zone libérée peut être confiée immédiatement en intérim à un autre Coordinateur.
 */
export async function POST(request: NextRequest) {
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

    const orgRef = adminDb.collection('organisations').doc(orgCode)
    const orgDoc = await orgRef.get()
    const primarySmUid = orgDoc.exists ? orgDoc.data()?.seniorManagerUid : null

    const isPrimarySeniorManager =
      callerData.isPrimarySeniorManager !== false &&
      !Boolean(callerData.invitedByUid) &&
      (!primarySmUid || primarySmUid === callerUid)

    if (!isPrimarySeniorManager) {
      return NextResponse.json(
        { message: 'Seul le Coordinateur principal (initiateur de l’organisation) peut retirer un Coordinateur d’une zone.' },
        { status: 403 }
      )
    }

    // 3. Validation du body
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps de requête JSON invalide' }, { status: 400 })
    }

    const { coordinatorUid, interimCoordinatorUid } = body as {
      coordinatorUid?: string
      interimCoordinatorUid?: string | null
    }

    if (!coordinatorUid || typeof coordinatorUid !== 'string') {
      return NextResponse.json({ message: 'L’identifiant du coordinateur est requis' }, { status: 400 })
    }

    const cleanInterimUid =
      typeof interimCoordinatorUid === 'string' && interimCoordinatorUid.trim()
        ? interimCoordinatorUid.trim()
        : null

    if (cleanInterimUid && cleanInterimUid === coordinatorUid) {
      return NextResponse.json(
        { message: 'Le coordinateur intérimaire doit être différent du coordinateur retiré.' },
        { status: 400 }
      )
    }

    const now = new Date()

    const result = await adminDb.runTransaction(async (tx) => {
      const targetRef = adminDb.collection('users').doc(coordinatorUid)
      const targetDoc = await tx.get(targetRef)
      if (!targetDoc.exists) {
        throw { status: 404, message: 'Coordinateur introuvable' }
      }

      const targetData = targetDoc.data() || {}
      if (targetData.orgCode !== orgCode || targetData.orgRole !== 'senior_manager') {
        throw { status: 400, message: 'L’utilisateur ciblé n’est pas un Coordinateur de votre organisation' }
      }

      const rawSeg = typeof targetData.segment === 'string' ? targetData.segment.trim() : ''
      const rawZone = typeof targetData.zone === 'string' ? targetData.zone.trim() : ''
      const oldSegment = rawSeg.split('(')[0]?.trim().toUpperCase() || ''
      const oldZone = rawZone || rawSeg.match(/\(([^)]+)\)/)?.[1]?.trim() || null
      const oldDisplay =
        (typeof targetData.displaySegment === 'string' && targetData.displaySegment.trim()) ||
        (oldZone && oldSegment ? `${oldSegment} (${oldZone})` : oldSegment)

      if (!oldSegment || !oldDisplay) {
        throw { status: 400, message: 'Ce Coordinateur n’a actuellement aucune zone titulaire affectée.' }
      }

      let interimRef: FirebaseFirestore.DocumentReference | null = null
      let nextInterimList: any[] | undefined

      if (cleanInterimUid) {
        interimRef = adminDb.collection('users').doc(cleanInterimUid)
        const interimDoc = await tx.get(interimRef)
        if (!interimDoc.exists) {
          throw { status: 404, message: 'Coordinateur intérimaire introuvable' }
        }
        const interimData = interimDoc.data() || {}
        if (interimData.orgCode !== orgCode || interimData.orgRole !== 'senior_manager') {
          throw { status: 400, message: 'Le destinataire intérimaire doit être un Coordinateur de votre organisation.' }
        }
        const existingInterims = Array.isArray(interimData.interimSegments) ? interimData.interimSegments : []
        const alreadyAssigned = existingInterims.some((it: any) => {
          const disp = (typeof it === 'string' ? it : it?.displaySegment || (it?.zone ? `${it.segment} (${it.zone})` : it?.segment) || '')
            .trim()
            .toLowerCase()
          return disp === oldDisplay.toLowerCase()
        })

        nextInterimList = alreadyAssigned
          ? existingInterims
          : [
              ...existingInterims,
              {
                segment: oldSegment,
                zone: oldZone,
                displaySegment: oldDisplay,
                assignedAt: now.toISOString(),
                assignedByUid: callerUid
              }
            ]
      }

      const freshOrgDoc = await tx.get(orgRef)
      const existingVacant = Array.isArray(freshOrgDoc.data()?.vacantZones) ? freshOrgDoc.data()?.vacantZones : []
      const hasVacant = existingVacant.some(
        (v: any) => String(v?.displaySegment || '').trim().toLowerCase() === oldDisplay.toLowerCase()
      )
      const updatedVacant = hasVacant
        ? existingVacant
        : [
            ...existingVacant,
            {
              segment: oldSegment,
              zone: oldZone,
              displaySegment: oldDisplay,
              vacatedAt: now.toISOString()
            }
          ]

      // 1. Retirer la zone titulaire du Coordinateur
      tx.update(targetRef, {
        segment: null,
        zone: null,
        displaySegment: null,
        updatedAt: now
      })

      // 2. Enregistrer la zone comme vacante dans l'organisation
      if (freshOrgDoc.exists) {
        tx.update(orgRef, {
          vacantZones: updatedVacant,
          updatedAt: now
        })
      }

      // 3. Confier en intérim si demandé
      if (interimRef && nextInterimList) {
        tx.update(interimRef, {
          interimSegments: nextInterimList,
          updatedAt: now
        })
      }

      return {
        oldSegment,
        oldZone,
        oldDisplay,
        targetName: targetData.displayName || targetData.name || targetData.email,
        nextInterimList
      }
    })

    // 4. Détacher les Superviseurs (Team Managers) rattachés à ce Coordinateur sans altérer leurs équipes/données
    let detachedSupervisorsCount = 0
    try {
      const subTmsSnap = await adminDb
        .collection('users')
        .where('orgCode', '==', orgCode)
        .where('seniorManagerUid', '==', coordinatorUid)
        .get()

      if (!subTmsSnap.empty) {
        const batch = adminDb.batch()
        subTmsSnap.docs.forEach((doc) => {
          batch.update(doc.ref, {
            seniorManagerUid: cleanInterimUid || null,
            updatedAt: now
          })
        })
        await batch.commit()
        detachedSupervisorsCount = subTmsSnap.size
      }
    } catch (tmErr) {
      console.warn('[POST /api/team/org/coordinator/unassign] Supervisors detach warning:', tmErr)
    }

    // 5. Synchroniser les Custom Claims Auth du Coordinateur retiré
    try {
      await adminAuth.setCustomUserClaims(coordinatorUid, {
        role: 'manager',
        orgRole: 'senior_manager',
        orgCode,
        segment: null
      })
    } catch (claimErr) {
      console.warn('[POST /api/team/org/coordinator/unassign] Auth claims sync warning:', claimErr)
    }

    return NextResponse.json({
      success: true,
      coordinatorUid,
      removedZone: result.oldDisplay,
      interimCoordinatorUid: cleanInterimUid,
      interimSegments: result.nextInterimList,
      detachedSupervisorsCount,
      message: cleanInterimUid
        ? `${result.targetName} a été retiré de la zone « ${result.oldDisplay} », confiée en intérim.`
        : `${result.targetName} a été retiré de la zone « ${result.oldDisplay} ». La zone est désormais vacante.`
    })
  } catch (error: any) {
    if (error && typeof error.status === 'number' && typeof error.message === 'string') {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error('[POST /api/team/org/coordinator/unassign] Error:', error)
    return NextResponse.json(
      { message: error.message || 'Erreur lors du retrait du Coordinateur de la zone' },
      { status: 500 }
    )
  }
}
