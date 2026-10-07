import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

function normalizeStatus(s: string) {
  const st = (s || '').toLowerCase().trim()
  if (['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead'].includes(st)) return 'prospection'
  if (['negociation', 'negotiation', 'in_progress', 'en_cours'].includes(st)) return 'negociation'
  if (['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(st)) return 'conclue'
  return 'prospection'
}

/**
 * GET /api/team/migrate-senior-members
 * Retourne la liste des prospects et membres actuellement rattachés au compte Senior Manager,
 * permettant au Senior Manager de sélectionner précisément les prospects à transférer.
 */
export async function GET(request: NextRequest) {
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
    if (!hasActivePaidManagerAccess(callerData) || callerData?.orgRole !== 'senior_manager') {
      return NextResponse.json({ error: 'Action réservée au Senior Manager' }, { status: 403 })
    }

    const orgCode = callerData.orgCode
    if (!orgCode) {
      return NextResponse.json({ error: 'Aucun code organisation associé' }, { status: 400 })
    }

    // Récupérer les prospects rattachés au Senior Manager
    const [pipelineByManagerSnap, pipelineByUserSnap] = await Promise.all([
      adminDb.collection('pipeline').where('managerUid', '==', callerUid).get(),
      adminDb.collection('pipeline').where('userId', '==', callerUid).get()
    ])

    const prospectsMap = new Map<string, any>()

    const processDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data()
      // Ne garder que les prospects qui sont encore rattachés au Senior Manager
      // (c-à-d pas déjà transférés à un autre Team Manager)
      if (data.managerUid && data.managerUid !== callerUid) {
        return
      }

      prospectsMap.set(doc.id, {
        id: doc.id,
        companyName: data.companyName || data.name || 'Entreprise sans nom',
        companySector: data.companySector || data.sector || null,
        companyCity: data.companyCity || data.city || data.region || null,
        companyPhone: data.companyPhone || data.telephone || data.phone || null,
        status: normalizeStatus(data.status),
        amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
        assignedTo: data.assignedTo || null,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || null)
      })
    }

    pipelineByManagerSnap.docs.forEach(processDoc)
    pipelineByUserSnap.docs.forEach(processDoc)

    const prospects = Array.from(prospectsMap.values()).sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })

    // Récupérer les Team Managers de l'organisation
    const teamManagersSnap = await adminDb
      .collection('users')
      .where('orgCode', '==', orgCode)
      .where('role', '==', 'manager')
      .get()

    const teamManagers = teamManagersSnap.docs
      .filter(d => d.id !== callerUid && d.data().orgRole !== 'senior_manager')
      .map(d => ({
        uid: d.id,
        name: d.data().displayName || d.data().name || d.data().email || 'Team Manager',
        email: d.data().email || ''
      }))

    // Compter les membres commerciaux éventuellement encore sous le compte Senior
    const accessSnap = await adminDb
      .collection('team_accesses')
      .where('managerUid', '==', callerUid)
      .get()

    return NextResponse.json({
      prospects,
      totalProspects: prospects.length,
      teamManagers,
      membersCount: accessSnap.size
    })
  } catch (err: any) {
    console.error('GET /api/team/migrate-senior-members error:', err)
    return NextResponse.json({ error: err.message || 'Erreur lors de la récupération des prospects' }, { status: 500 })
  }
}

/**
 * POST /api/team/migrate-senior-members
 * Permet au Senior Manager de transférer les prospects sélectionnés (ou tous)
 * vers un Team Manager désigné.
 *
 * RÈGLE FONDAMENTALE : C'est un TRANSFERT et NON UNE ASSIGNATION.
 * - Le managerUid devient le targetManagerUid.
 * - assignedTo est explicitement vidé (null).
 * - Le Team Manager n'est PAS un commercial.
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
    if (!hasActivePaidManagerAccess(callerData) || callerData?.orgRole !== 'senior_manager') {
      return NextResponse.json({ error: 'Action réservée au Senior Manager' }, { status: 403 })
    }

    const orgCode = callerData.orgCode
    if (!orgCode) {
      return NextResponse.json({ error: 'Aucun code organisation associé' }, { status: 400 })
    }

    const body = await request.json()
    const { targetManagerUid, prospectIds, migrateMembers } = body
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

    // Récupérer les items pipeline à transférer
    let pipelineDocsToTransfer: FirebaseFirestore.DocumentSnapshot[] = []

    if (Array.isArray(prospectIds) && prospectIds.length > 0) {
      // 1. Transfert sélectif : uniquement les prospects choisis par le Senior Manager
      const selectedIdSet = new Set<string>(prospectIds)
      const [byManagerSnap, byUserSnap] = await Promise.all([
        adminDb.collection('pipeline').where('managerUid', '==', callerUid).get(),
        adminDb.collection('pipeline').where('userId', '==', callerUid).get()
      ])

      const seen = new Set<string>()
      const candidateDocs = [...byManagerSnap.docs, ...byUserSnap.docs]

      for (const d of candidateDocs) {
        if (selectedIdSet.has(d.id) && !seen.has(d.id)) {
          seen.add(d.id)
          // Vérifier qu'il appartient bien au compte Senior
          const dData = d.data()
          if (!dData.managerUid || dData.managerUid === callerUid) {
            pipelineDocsToTransfer.push(d)
          }
        }
      }
    } else {
      // 2. Transfert global de tous les prospects du compte Senior
      const [byManagerSnap, byUserSnap] = await Promise.all([
        adminDb.collection('pipeline').where('managerUid', '==', callerUid).get(),
        adminDb.collection('pipeline').where('userId', '==', callerUid).get()
      ])
      const seen = new Set<string>()
      for (const d of [...byManagerSnap.docs, ...byUserSnap.docs]) {
        if (!seen.has(d.id)) {
          seen.add(d.id)
          const dData = d.data()
          if (!dData.managerUid || dData.managerUid === callerUid) {
            pipelineDocsToTransfer.push(d)
          }
        }
      }
    }

    // Récupérer les membres et accès si demandé
    let accessDocs: FirebaseFirestore.QueryDocumentSnapshot[] = []
    let memberUserDocs: FirebaseFirestore.QueryDocumentSnapshot[] = []
    let assignmentDocs: FirebaseFirestore.QueryDocumentSnapshot[] = []
    let importDocs: FirebaseFirestore.QueryDocumentSnapshot[] = []

    if (migrateMembers) {
      const [accessSnap, membersUsersSnap, assignmentsSnap, importsSnap] = await Promise.all([
        adminDb.collection('team_accesses').where('managerUid', '==', callerUid).get(),
        adminDb.collection('users').where('managerUid', '==', callerUid).get(),
        adminDb.collection('assignments').where('managerId', '==', callerUid).get(),
        adminDb.collection('imports').where('managerId', '==', callerUid).get()
      ])
      accessDocs = accessSnap.docs
      memberUserDocs = membersUsersSnap.docs
      assignmentDocs = assignmentsSnap.docs
      importDocs = importsSnap.docs
    }

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

    const now = new Date()

    // Màj pipeline : TRANSFERT PROSPECT
    // RÈGLE : C'est un TRANSFERT vers le Team Manager, pas une assignation.
    // assignedTo doit être null. Le Team Manager n'est pas un commercial.
    for (const doc of pipelineDocsToTransfer) {
      batch.update(doc.ref, {
        managerUid: targetManagerUid,
        managerName: targetManagerName,
        userId: targetManagerUid, // Le Team Manager devient détenteur du prospect en attente d'attribution
        assignedTo: null,          // EXPLICITEMENT NON ASSIGNÉ
        assignedAt: null,
        memberName: null,
        memberAccessId: null,
        transferredFromSeniorUid: callerUid,
        migratedFromSeniorAt: now,
        transferredAt: now,
        updatedAt: now
      })
      opCount++
      await commitBatchIfFull()
    }

    // Màj team_accesses
    for (const doc of accessDocs) {
      batch.update(doc.ref, {
        managerUid: targetManagerUid,
        managerEmail: targetManagerEmail,
        managerName: targetManagerName,
        migratedFromSeniorAt: now
      })
      opCount++
      await commitBatchIfFull()
    }

    // Màj users (membres)
    for (const doc of memberUserDocs) {
      batch.update(doc.ref, {
        managerUid: targetManagerUid,
        managerEmail: targetManagerEmail,
        migratedFromSeniorAt: now
      })
      opCount++
      await commitBatchIfFull()
    }

    // Màj assignments
    for (const doc of assignmentDocs) {
      batch.update(doc.ref, {
        managerId: targetManagerUid,
        migratedFromSeniorAt: now
      })
      opCount++
      await commitBatchIfFull()
    }

    // Màj imports
    for (const doc of importDocs) {
      batch.update(doc.ref, {
        managerId: targetManagerUid,
        migratedFromSeniorAt: now
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
        pipeline: pipelineDocsToTransfer.length,
        teamAccesses: accessDocs.length,
        teamUsers: memberUserDocs.length,
        assignments: assignmentDocs.length,
        imports: importDocs.length
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
