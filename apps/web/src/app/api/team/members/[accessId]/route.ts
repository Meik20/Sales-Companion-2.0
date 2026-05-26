import { NextRequest, NextResponse } from 'next/server'

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
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const { accessId } = await params
    if (!accessId) return NextResponse.json({ message: 'accessId manquant' }, { status: 400 })

    // Verify the access belongs to this manager
    const accessDoc = await adminDb.collection('team_accesses').doc(accessId).get()
    if (!accessDoc.exists) {
      return NextResponse.json({ message: 'Accès introuvable' }, { status: 404 })
    }

    const accessData = accessDoc.data()!
    if (accessData.managerUid !== managerUid) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 403 })
    }

    const memberFirebaseUid: string | null = accessData.firebaseUid ?? null

    // 1. Delete the team_accesses document
    await accessDoc.ref.delete()

    // 2. Delete pipeline items belonging to this member under this manager
    let pipelineDeleted = 0
    if (memberFirebaseUid) {
      const pipelineSnap = await adminDb
        .collection('pipeline')
        .where('userId', '==', memberFirebaseUid)
        .where('managerUid', '==', managerUid)
        .get()
      for (const doc of pipelineSnap.docs) {
        await doc.ref.delete()
        pipelineDeleted++
      }
    }
    // Also clean up email-like userId (before repair was run)
    const emailPipelineSnap = await adminDb
      .collection('pipeline')
      .where('userId', '==', accessId)
      .get()
    for (const doc of emailPipelineSnap.docs) {
      await doc.ref.delete()
      pipelineDeleted++
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
      pipelineDeleted,
      assignmentsDeleted
    })
  } catch (error) {
    console.error('[team/members DELETE]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
