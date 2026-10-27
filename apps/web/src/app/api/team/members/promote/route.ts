import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/team/members/promote
 * Promotion interne d'un commercial terrain ('member') en Team Manager ('manager', orgRole: 'team_manager')
 * initiée par le Senior Manager de son segment.
 *
 * RÈGLES D'OR ARCHITECTURALES (AGENTS.md) :
 * 1. Autorité Senior Manager : Seul un Senior Manager avec abonnement actif peut promouvoir un commercial de son segment.
 * 2. Évolution in-place : Le compte de l'utilisateur (users/{memberUid}) est conservé avec son identifiant, son e-mail et ses stats.
 * 3. Libération de siège : L'ancien slot team_accesses du commercial sous son ancien TM est libéré (passé en status: 'promoted').
 * 4. Continuité des affaires actives : Ses fiches de pipeline actives (prospection/negociation) passent sous son propre managerUid.
 * 5. Sanctification de la base clients : Les affaires déjà conclues restent définitivement sous l'ancien TM (collection 'clients').
 * 6. Synchronisation Auth : Le custom claim role est mis à jour sur 'manager'.
 */

const ACTIVE_PIPELINE_STATUSES = ['prospection', 'negociation']

export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    // ── 1. Authentification ────────────────────────────────────────────────
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

    // ── 2. Vérification des droits Senior Manager ─────────────────────────
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

    // ── 3. Validation du corps de requête ─────────────────────────────────
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps de requête JSON invalide' }, { status: 400 })
    }

    const { memberUid, segment: requestedSegment } = body as {
      memberUid?: string
      segment?: string
    }

    if (!memberUid) {
      return NextResponse.json(
        { message: 'Le commercial (memberUid) est requis' },
        { status: 400 }
      )
    }

    // Récupérer le profil du commercial
    const memberDoc = await adminDb.collection('users').doc(memberUid).get()
    const memberData = memberDoc.data()
    if (!memberDoc.exists || !memberData) {
      return NextResponse.json({ message: 'Commercial introuvable' }, { status: 404 })
    }

    // Vérifier l'appartenance à l'organisation
    if (memberData.orgCode !== orgCode) {
      return NextResponse.json(
        { message: "Ce commercial n'appartient pas à votre organisation" },
        { status: 400 }
      )
    }

    // Vérifier que c'est bien un commercial (rôle 'member')
    if (memberData.role !== 'member') {
      return NextResponse.json(
        { message: `Impossible de promouvoir cet utilisateur (rôle actuel: ${memberData.role || 'inconnu'})` },
        { status: 400 }
      )
    }

    // Vérifier le cloisonnement par segment : chaque SM arbitre son segment respectif
    const callerSegment = (callerData.segment as string | undefined)?.trim()
    if (callerSegment && memberData.segment && (memberData.segment as string).trim().toLowerCase() !== callerSegment.toLowerCase()) {
      return NextResponse.json(
        { message: `Ce commercial est rattaché au segment "${memberData.segment}", distinct de votre segment ("${callerSegment}")` },
        { status: 400 }
      )
    }

    const memberName = memberData.displayName || memberData.name || memberData.email || 'Commercial'
    const sourceManagerUid = (memberData.managerUid as string) || null

    // Segment final du nouveau TM
    const targetSegment = requestedSegment?.trim() || memberData.segment || callerSegment || 'Principal'

    // Récupérer le nom de l'ancien TM s'il existe
    let sourceManagerName = 'Ancien Manager'
    if (sourceManagerUid) {
      const srcDoc = await adminDb.collection('users').doc(sourceManagerUid).get()
      if (srcDoc.exists) {
        const sd = srcDoc.data()
        sourceManagerName = sd?.displayName || sd?.name || sd?.email || 'Ancien Manager'
      }
    }

    // ── 4. Récupération des données associées ──────────────────────────────
    const [
      pipelineUserSnap,
      pipelineAssignedSnap,
      assignmentsSnap,
      accessesSnap
    ] = await Promise.all([
      // Fiches dont le commercial est créateur
      adminDb.collection('pipeline').where('userId', '==', memberUid).get(),
      // Fiches assignées au commercial
      adminDb.collection('pipeline').where('assignedTo', '==', memberUid).get(),
      // Assignations actives de ce commercial
      adminDb.collection('team_assignments').where('memberId', '==', memberUid).get(),
      // Fiches d'accès team_accesses du commercial
      adminDb.collection('team_accesses').where('orgCode', '==', orgCode).get()
    ])

    // Agréger les fiches actives du commercial (prospection / négociation)
    const pipelineDocsMap = new Map<string, FirebaseFirestore.DocumentSnapshot>()
    for (const d of [...pipelineUserSnap.docs, ...pipelineAssignedSnap.docs]) {
      const data = d.data()
      if (!data?.orgCode || data.orgCode === orgCode) {
        if (ACTIVE_PIPELINE_STATUSES.includes(data?.status)) {
          pipelineDocsMap.set(d.id, d)
        }
      }
    }

    for (const aDoc of assignmentsSnap.docs) {
      const pEntryId = aDoc.data()?.pipelineEntryId
      if (pEntryId && !pipelineDocsMap.has(pEntryId)) {
        try {
          const pDoc = await adminDb.collection('pipeline').doc(pEntryId).get()
          if (pDoc.exists) {
            const pData = pDoc.data()
            if ((!pData?.orgCode || pData?.orgCode === orgCode) && ACTIVE_PIPELINE_STATUSES.includes(pData?.status)) {
              pipelineDocsMap.set(pDoc.id, pDoc)
            }
          }
        } catch (err) {
          console.warn('[POST /api/team/members/promote] pipelineEntryId fetch error:', err)
        }
      }
    }

    // Trouver les accès team_accesses correspondant à ce commercial
    const matchingAccessDocs = accessesSnap.docs.filter((d) => {
      const ad = d.data()
      return (
        ad.firebaseUid === memberUid ||
        ad.memberId === memberUid ||
        (memberData.accessId && d.id.toLowerCase() === String(memberData.accessId).toLowerCase()) ||
        (memberData.email && ad.email && String(ad.email).toLowerCase() === String(memberData.email).toLowerCase())
      )
    })

    const now = new Date()
    const { FieldValue } = await import('firebase-admin/firestore')

    // ── 5. Exécution du batch atomique ─────────────────────────────────────
    let batch = adminDb.batch()
    let opCount = 0

    const commitBatchIfFull = async () => {
      if (opCount >= 400) {
        await batch.commit()
        batch = adminDb.batch()
        opCount = 0
      }
    }

    // A. Mettre à jour le document de l'utilisateur promu
    batch.update(memberDoc.ref, {
      role: 'manager',
      orgRole: 'team_manager',
      segment: targetSegment,
      seniorManagerUid: callerUid,
      managerUid: FieldValue.delete(),
      previousManagerUid: sourceManagerUid,
      previousRole: 'member',
      promotedAt: now,
      promotedByUid: callerUid,
      // Hériter du plan et de l'abonnement actif de l'organisation
      plan: callerData.plan || 'pro',
      subscriptionExpiresAt: callerData.subscriptionExpiresAt || null,
      active: true,
      updatedAt: now
    })
    opCount++
    await commitBatchIfFull()

    // B. Mettre à jour les accès d'équipe (libération du slot commercial de l'ancien TM)
    for (const d of matchingAccessDocs) {
      batch.update(d.ref, {
        status: 'promoted',
        promotedAt: now,
        active: false,
        updatedAt: now
      })
      opCount++
      await commitBatchIfFull()
    }

    // C. Mettre à jour les opportunités actives (le nouveau TM devient leur manager responsable)
    for (const [, pDoc] of pipelineDocsMap) {
      batch.update(pDoc.ref, {
        managerUid: memberUid, // Le nouveau TM est désormais le manager responsable de ses propres affaires en cours
        previousManagerUid: sourceManagerUid,
        promotedMemberAt: now,
        updatedAt: now
      })
      opCount++
      await commitBatchIfFull()
    }

    // Valider le batch final
    if (opCount > 0) {
      await batch.commit()
    }

    // ── 6. Synchronisation du custom claim Firebase Auth ───────────────────
    try {
      await adminAuth.setCustomUserClaims(memberUid, {
        role: 'manager',
        orgRole: 'team_manager',
        orgCode
      })
    } catch (authErr) {
      console.warn('[POST /api/team/members/promote] Custom claims sync warning:', authErr)
    }

    // ── 7. Heartbeat organisation ──────────────────────────────────────────
    try {
      await adminDb.collection('organisations').doc(orgCode).update({
        lastActivityAt: now,
        updatedAt: now
      })
    } catch (orgErr) {
      console.warn('[POST /api/team/members/promote] org heartbeat failed:', orgErr)
    }

    // ── 8. Notifications internes ──────────────────────────────────────────
    try {
      const { createUserNotification } = await import('@/lib/user-notifications')
      // Notifier le nouveau Team Manager
      await createUserNotification({
        userId: memberUid,
        type: 'general',
        title: 'Félicitations pour votre promotion !',
        message: `Vous avez été promu Team Manager dans le segment "${targetSegment}". Vous pouvez désormais recruter et piloter votre propre équipe commerciale.`,
        link: '/team',
        metadata: {
          promotedByUid: callerUid,
          segment: targetSegment,
          orgCode
        }
      })

      // Notifier l'ancien Team Manager s'il existe
      if (sourceManagerUid) {
        await createUserNotification({
          userId: sourceManagerUid,
          type: 'general',
          title: 'Commercial promu Team Manager',
          message: `${memberName} a été promu Team Manager par la direction. Une place de commercial a été libérée dans votre équipe.`,
          link: '/team',
          metadata: {
            promotedMemberUid: memberUid,
            promotedByName: callerData.displayName || callerData.name || 'Senior Manager',
            orgCode
          }
        })
      }
    } catch (notifErr) {
      console.warn('[POST /api/team/members/promote] Notification error:', notifErr)
    }

    return NextResponse.json({
      success: true,
      promotedMember: {
        uid: memberUid,
        name: memberName,
        email: memberData.email,
        role: 'manager',
        orgRole: 'team_manager',
        segment: targetSegment
      },
      previousManager: {
        uid: sourceManagerUid,
        name: sourceManagerName
      },
      transferredActivePipelineCount: pipelineDocsMap.size
    })
  } catch (error: any) {
    console.error('[POST /api/team/members/promote] error:', error)
    return NextResponse.json(
      { message: error?.message || 'Erreur interne du serveur lors de la promotion du commercial' },
      { status: 500 }
    )
  }
}
