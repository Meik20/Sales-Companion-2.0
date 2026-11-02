import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * DELETE /api/team/members/[accessId]
 * Removes a team member completely:
 *  1. Deletes team_accesses/{accessId}
 *  2. Optionally disables the Firebase Auth account (doesn't delete — preserves data integrity)
 *  3. Removes their pipeline items assigned by this manager
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accessId: string }> }
) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    // Auth check
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let managerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      managerUid = decoded.uid
      const managerDoc = await adminDb.collection('users').doc(managerUid).get()
      if (!hasActivePaidManagerAccess(managerDoc.data()) || decoded.email_verified !== true) {
        return NextResponse.json(
          { message: 'Un abonnement Manager actif et vérifié est requis.' },
          { status: 403 }
        )
      }
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const { accessId } = await params
    if (!accessId) return NextResponse.json({ message: 'accessId manquant' }, { status: 400 })

    // Verify the access belongs to this manager
    let accessDoc = await adminDb.collection('team_accesses').doc(accessId).get()
    let accessData = accessDoc.data()

    if (!accessDoc.exists) {
      const byField = await adminDb
        .collection('team_accesses')
        .where('accessId', '==', accessId.toLowerCase().trim())
        .where('managerUid', '==', managerUid)
        .limit(1)
        .get()
      if (!byField.empty && byField.docs[0]) {
        accessDoc = byField.docs[0] as any
        accessData = accessDoc.data()
      }
    }

    if (!accessDoc.exists || !accessData) {
      return NextResponse.json({ message: 'Accès introuvable' }, { status: 404 })
    }
    if (accessData.managerUid !== managerUid) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 403 })
    }

    const memberFirebaseUid: string | null = accessData.firebaseUid ?? null

    // 1. Delete the team_accesses document
    await accessDoc.ref.delete()

    // 2. Sécurisation patrimoniale anti-perte de données :
    // RÈGLE MÉTIER INVIOLABLE : En cas de révocation, le commercial n'emporte pas ses dossiers.
    // Les opportunités actives restent chez le Team Manager et sont DÉSASSIGNÉES (sas "Non assignées")
    // pour être réattribuées immédiatement aux autres commerciaux de l'équipe.
    // Les affaires conclues restent définitivement intactes dans l'historique et la base clients du manager.
    let pipelineUnassigned = 0
    const queryActiveByUser = memberFirebaseUid
      ? await adminDb
          .collection('pipeline')
          .where('managerUid', '==', managerUid)
          .where('userId', '==', memberFirebaseUid)
          .get()
      : { docs: [] }

    const queryActiveByAssigned = memberFirebaseUid
      ? await adminDb
          .collection('pipeline')
          .where('managerUid', '==', managerUid)
          .where('assignedTo', '==', memberFirebaseUid)
          .get()
      : { docs: [] }

    const emailPipelineSnap = await adminDb
      .collection('pipeline')
      .where('managerUid', '==', managerUid)
      .where('userId', '==', accessId)
      .get()

    const allMemberDeals = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
    for (const d of queryActiveByUser.docs) allMemberDeals.set(d.id, d)
    for (const d of queryActiveByAssigned.docs) allMemberDeals.set(d.id, d)
    for (const d of emailPipelineSnap.docs) allMemberDeals.set(d.id, d)

    for (const doc of allMemberDeals.values()) {
      const data = doc.data()
      const st = String(data.status || '').toLowerCase().trim()
      // Si l'affaire n'est pas conclue, la désassigner pour reprise par le Team Manager
      if (!['conclue', 'conclusion', 'closed', 'won'].includes(st)) {
        await doc.ref.update({
          assignedTo: null,
          assignedName: null,
          previousAssignedTo: memberFirebaseUid || accessId,
          unassignedReason: 'member_revoked',
          unassignedAt: new Date(),
          updatedAt: new Date()
        })
        pipelineUnassigned++
      }
    }

    // 3. Delete team_assignments for this member
    let assignmentsDeleted = 0
    const assignmentsSnap = await adminDb
      .collection('team_assignments')
      .where('managerUid', '==', managerUid)
      .where('memberId', '==', accessId)
      .get()
    for (const doc of assignmentsSnap.docs) {
      await doc.ref.delete()
      assignmentsDeleted++
    }
    // Also by UID
    if (memberFirebaseUid) {
      const assignmentsUidSnap = await adminDb
        .collection('team_assignments')
        .where('managerUid', '==', managerUid)
        .where('memberId', '==', memberFirebaseUid)
        .get()
      for (const doc of assignmentsUidSnap.docs) {
        await doc.ref.delete()
        assignmentsDeleted++
      }
    }

    // 3b. Supprimer les objectifs d'équipe (teamTargets) associés à ce membre chez ce manager
    let targetsDeleted = 0
    const memberIdsToClean = [accessId]
    if (memberFirebaseUid && !memberIdsToClean.includes(memberFirebaseUid)) {
      memberIdsToClean.push(memberFirebaseUid)
    }
    for (const mId of memberIdsToClean) {
      const targetsSnap = await adminDb
        .collection('teamTargets')
        .where('managerUid', '==', managerUid)
        .where('memberId', '==', mId)
        .get()
      for (const doc of targetsSnap.docs) {
        await doc.ref.delete()
        targetsDeleted++
      }
    }

    // 4. Update the user document to detach from manager and downgrade role
    // and disable Firebase Auth user (do not delete — audit trail)
    if (memberFirebaseUid) {
      try {
        await adminAuth.updateUser(memberFirebaseUid, { disabled: true })
        // Detach from the team
        await adminDb.collection('users').doc(memberFirebaseUid).update({
          managerUid: null,
          role: 'independent'
        })
      } catch (err) {
        console.error('[team/members DELETE] failed to update user/auth:', err)
        /* user might not exist yet */
      }
    }

    return NextResponse.json({
      success: true,
      pipelineDeleted: 0,
      pipelineUnassigned,
      assignmentsDeleted
    })
  } catch (error) {
    console.error('[team/members DELETE]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
