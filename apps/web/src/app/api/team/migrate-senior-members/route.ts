import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/team/migrate-senior-members
 * Permet au Senior Manager de transférer les membres (commerciaux/support)
 * et les prospects historiques encore rattachés à son UID vers un Team Manager désigné.
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ error: 'Session expirée ou invalide' }, { status: 401 })
    }

    // Vérifier les droits du Senior Manager
    const callerDoc = await adminDb.collection('users').doc(callerUid).get()
    const callerData = callerDoc.data()
    if (!callerData || callerData.role !== 'manager' || callerData.orgRole !== 'senior_manager') {
      return NextResponse.json({ error: 'Action réservée au Senior Manager' }, { status: 403 })
    }

    const orgCode = callerData.orgCode
    if (!orgCode) {
      return NextResponse.json({ error: 'Aucun code organisation associé' }, { status: 400 })
    }

    const body = await request.json()
    const { targetManagerUid } = body
    if (!targetManagerUid) {
      return NextResponse.json({ error: 'Veuillez sélectionner un Team Manager cible' }, { status: 400 })
    }

    if (targetManagerUid === callerUid) {
      return NextResponse.json({ error: 'Le manager cible ne peut pas être le Senior Manager lui-même' }, { status: 400 })
    }

    // Vérifier que le manager cible existe, est manager et fait partie de la même organisation
    const targetDoc = await adminDb.collection('users').doc(targetManagerUid).get()
    const targetData = targetDoc.data()
    if (!targetDoc.exists || !targetData) {
      return NextResponse.json({ error: 'Team Manager cible introuvable' }, { status: 404 })
    }
    if (targetData.orgCode !== orgCode || targetData.role !== 'manager') {
      return NextResponse.json({ error: 'Le manager cible n\'appartient pas à votre organisation' }, { status: 400 })
    }

    const targetManagerName = targetData.displayName || targetData.name || targetData.email || 'Team Manager'
    const targetManagerEmail = targetData.email || ''

    // 1. Récupérer les team_accesses du Senior Manager
    const accessSnap = await adminDb
      .collection('team_accesses')
      .where('managerUid', '==', callerUid)
      .get()

    // 2. Récupérer les users (membres commerciaux) ayant managerUid == callerUid
    const membersUsersSnap = await adminDb
      .collection('users')
      .where('managerUid', '==', callerUid)
      .get()

    // 3. Récupérer les items pipeline du Senior Manager
    const pipelineSnap = await adminDb
      .collection('pipeline')
      .where('managerUid', '==', callerUid)
      .get()

    // 4. Récupérer les assignments du Senior Manager
    const assignmentsSnap = await adminDb
      .collection('assignments')
      .where('managerId', '==', callerUid)
      .get()

    // 5. Récupérer les imports du Senior Manager
    const importsSnap = await adminDb
      .collection('imports')
      .where('managerId', '==', callerUid)
      .get()

    // Exécuter les mises à jour par lot (batch Firestore limité à 500 ops)
    let batch = adminDb.batch()
    let opCount = 0

    const commitBatchIfFull = async () => {
      if (opCount >= 400) {
        await batch.commit()
        batch = adminDb.batch()
        opCount = 0
      }
    }

    // Màj team_accesses
    for (const doc of accessSnap.docs) {
      batch.update(doc.ref, {
        managerUid: targetManagerUid,
        managerEmail: targetManagerEmail,
        managerName: targetManagerName,
        migratedFromSeniorAt: new Date()
      })
      opCount++
      await commitBatchIfFull()
    }

    // Màj users (membres)
    for (const doc of membersUsersSnap.docs) {
      batch.update(doc.ref, {
        managerUid: targetManagerUid,
        managerEmail: targetManagerEmail,
        migratedFromSeniorAt: new Date()
      })
      opCount++
      await commitBatchIfFull()
    }

    // Màj pipeline
    for (const doc of pipelineSnap.docs) {
      batch.update(doc.ref, {
        managerUid: targetManagerUid,
        managerName: targetManagerName,
        migratedFromSeniorAt: new Date()
      })
      opCount++
      await commitBatchIfFull()
    }

    // Màj assignments
    for (const doc of assignmentsSnap.docs) {
      batch.update(doc.ref, {
        managerId: targetManagerUid,
        migratedFromSeniorAt: new Date()
      })
      opCount++
      await commitBatchIfFull()
    }

    // Màj imports
    for (const doc of importsSnap.docs) {
      batch.update(doc.ref, {
        managerId: targetManagerUid,
        migratedFromSeniorAt: new Date()
      })
      opCount++
      await commitBatchIfFull()
    }

    if (opCount > 0) {
      await batch.commit()
    }

    return NextResponse.json({
      success: true,
      migratedCount: {
        teamAccesses: accessSnap.size,
        teamUsers: membersUsersSnap.size,
        pipeline: pipelineSnap.size,
        assignments: assignmentsSnap.size,
        imports: importsSnap.size
      },
      targetManager: {
        uid: targetManagerUid,
        name: targetManagerName,
        email: targetManagerEmail
      }
    })
  } catch (err: any) {
    console.error('POST /api/team/migrate-senior-members error:', err)
    return NextResponse.json({ error: err.message || 'Erreur lors du transfert' }, { status: 500 })
  }
}
