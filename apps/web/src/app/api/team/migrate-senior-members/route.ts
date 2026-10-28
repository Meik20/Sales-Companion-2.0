import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

function normalizeStatus(s: string) {
  const st = (s || '').toLowerCase().trim()
  if (['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead'].includes(st))
    return 'prospection'
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

    // Récupérer les prospects rattachés au Senior Manager (pipeline et manager_prospects)
    const [pipelineByManagerSnap, pipelineByUserSnap, managerProspectsSnap] = await Promise.all([
      adminDb.collection('pipeline').where('managerUid', '==', callerUid).get(),
      adminDb.collection('pipeline').where('userId', '==', callerUid).get(),
      adminDb.collection('manager_prospects').where('managerId', '==', callerUid).get()
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
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || null
      })
    }

    const processManagerProspectDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data()
      if (data.transferredToManagerUid && data.transferredToManagerUid !== callerUid) {
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
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || null
      })
    }

    pipelineByManagerSnap.docs.forEach(processDoc)
    pipelineByUserSnap.docs.forEach(processDoc)
    managerProspectsSnap.docs.forEach(processManagerProspectDoc)

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
      .filter((d) => d.id !== callerUid && d.data().orgRole !== 'senior_manager')
      .map((d) => ({
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
    return NextResponse.json(
      { error: err.message || 'Erreur lors de la récupération des prospects' },
      { status: 500 }
    )
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
    const { targetManagerUid, prospectIds, migrateMembers, deadline } = body
    if (!targetManagerUid) {
      return NextResponse.json(
        { error: 'Veuillez sélectionner un Team Manager cible' },
        { status: 400 }
      )
    }

    if (targetManagerUid === callerUid) {
      return NextResponse.json(
        { error: 'Le manager cible ne peut pas être le Senior Manager lui-même' },
        { status: 400 }
      )
    }

    // Vérifier que le manager cible existe, est manager et fait partie de la même organisation
    const targetDoc = await adminDb.collection('users').doc(targetManagerUid).get()
    const targetData = targetDoc.data()
    if (!targetDoc.exists || !targetData) {
      return NextResponse.json({ error: 'Team Manager cible introuvable' }, { status: 404 })
    }
    if (targetData.orgCode !== orgCode || targetData.role !== 'manager') {
      return NextResponse.json(
        { error: "Le manager cible n'appartient pas à votre organisation" },
        { status: 400 }
      )
    }

    const targetManagerName =
      targetData.displayName || targetData.name || targetData.email || 'Team Manager'
    const targetManagerEmail = targetData.email || ''

    // Récupérer les items à transférer (pipeline et manager_prospects)
    let prospectDocsToTransfer: FirebaseFirestore.DocumentSnapshot[] = []

    const [byManagerSnap, byUserSnap, byManagerProspectsSnap] = await Promise.all([
      adminDb.collection('pipeline').where('managerUid', '==', callerUid).get(),
      adminDb.collection('pipeline').where('userId', '==', callerUid).get(),
      adminDb.collection('manager_prospects').where('managerId', '==', callerUid).get()
    ])

    const candidateDocs = [...byManagerSnap.docs, ...byUserSnap.docs, ...byManagerProspectsSnap.docs]
    const seen = new Set<string>()

    if (Array.isArray(prospectIds) && prospectIds.length > 0) {
      // 1. Transfert sélectif : uniquement les prospects choisis par le Senior Manager
      const selectedIdSet = new Set<string>(prospectIds)
      for (const d of candidateDocs) {
        if (selectedIdSet.has(d.id) && !seen.has(d.id)) {
          seen.add(d.id)
          const dData = d.data()
          const isEligible =
            (!dData.managerUid || dData.managerUid === callerUid) &&
            (!dData.managerId || dData.managerId === callerUid)
          if (isEligible) {
            prospectDocsToTransfer.push(d)
          }
        }
      }
    } else {
      // 2. Transfert global de tous les prospects du compte Senior
      for (const d of candidateDocs) {
        if (!seen.has(d.id)) {
          seen.add(d.id)
          const dData = d.data()
          const isEligible =
            (!dData.managerUid || dData.managerUid === callerUid) &&
            (!dData.managerId || dData.managerId === callerUid)
          if (isEligible) {
            prospectDocsToTransfer.push(d)
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

    // ── RÈGLE ARCHITECTURALE CANONIQUE ──
    // Un transfert de prospect du Senior Manager vers un Team Manager doit ATTERRIR
    // dans "Gestion d'équipe > Mes prospects importés" (collection manager_prospects).
    // Il ne doit JAMAIS polluer la collection pipeline du TM avec des dossiers non assignés.
    for (const doc of prospectDocsToTransfer) {
      const dData = doc.data() || {}
      const isFromPipeline = doc.ref.parent.id === 'pipeline'
      const targetProspectRef = isFromPipeline
        ? adminDb.collection('manager_prospects').doc(doc.id)
        : doc.ref

      const prospectPayload = {
        managerId: targetManagerUid, // Le Team Manager devient propriétaire
        orgCode,
        segment: targetData.segment || callerData.segment || null,
        name: dData.companyName || dData.name || 'Entreprise sans nom',
        companyName: dData.companyName || dData.name || 'Entreprise sans nom',
        companyId: dData.companyId || null,
        originSource: dData.originSource || 'senior_transfer',
        externalDirectoryId: dData.externalDirectoryId || dData.companyId || null,
        phone: dData.companyPhone || dData.telephone || dData.phone || null,
        email: dData.companyEmail || dData.email || null,
        city: dData.companyCity || dData.city || dData.region || null,
        sector: dData.companySector || dData.sector || null,
        region: dData.companyRegion || dData.region || null,
        quarter: dData.companyQuarter || dData.quarter || null,
        country: dData.companyCountry || dData.country || 'CM',
        notes: dData.note || dData.notes || '',
        status: 'new',
        assignedTo: null, // Non assigné à un commercial : le TM l'assignera
        transferredFromSeniorUid: callerUid,
        transferredToManagerUid: targetManagerUid,
        transferredToManagerName: targetManagerName,
        transferredAt: now,
        migratedFromSeniorAt: now,
        transferDeadline: deadline || null,
        assignmentDeadline: deadline || null,
        importedBy: callerUid,
        importedByRole: 'senior_manager',
        updatedAt: now
      }

      if (isFromPipeline) {
        batch.set(targetProspectRef, {
          ...prospectPayload,
          createdAt: dData.createdAt || now
        }, { merge: true })
        // Supprimer définitivement de la collection pipeline pour ne pas polluer le pipeline opérationnel
        batch.delete(doc.ref)
      } else {
        batch.update(doc.ref, prospectPayload)
      }

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
        transferredAt: now,
        transferDeadline: deadline || null,
        assignmentDeadline: deadline || null,
        migratedFromSeniorAt: now
      })
      opCount++
      await commitBatchIfFull()
    }

    if (opCount > 0) {
      await batch.commit()
    }

    // Mise à jour heartbeat de l'organisation pour réactivité temps réel
    if (orgCode) {
      try {
        await adminDb.collection('organisations').doc(orgCode).update({
          lastPipelineUpdate: now.toISOString(),
          lastImportsUpdate: now.toISOString()
        })
      } catch (orgErr) {
        console.warn('[migrate-senior-members] lastImportsUpdate write failed:', orgErr)
      }
    }

    // Synchronisation miroir Supabase private_prospects
    try {
      const { isPrivateProspectsTableAvailable, transferPrivateProspects } = await import(
        '@/lib/supabase-private-prospects'
      )
      if (await isPrivateProspectsTableAvailable()) {
        const idsToSync = prospectDocsToTransfer.map((d) => d.id)
        if (idsToSync.length > 0) {
          await transferPrivateProspects({
            prospectIds: idsToSync,
            orgCode,
            seniorUid: callerUid,
            targetManagerUid,
            targetManagerName,
            deadline: deadline || null
          })
        }
      }
    } catch (sbErr) {
      console.warn('[migrate-senior-members] Supabase transfer sync error:', sbErr)
    }

    // Notification In-App automatique pour le Team Manager récepteur
    try {
      const { createUserNotification } = await import('@/lib/user-notifications')
      const senderName = callerData.displayName || callerData.name || 'Le Senior Manager'
      const count = prospectDocsToTransfer.length
      const deadlineText = deadline
        ? ` avec une échéance fixée au ${new Date(deadline).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
          })}`
        : ''

      await createUserNotification({
        userId: targetManagerUid,
        type: 'prospect_transfer',
        title: 'Nouveaux prospects transférés',
        message: `${senderName} vous a transféré ${count} prospect${count > 1 ? 's' : ''}${deadlineText}. Retrouvez-${count > 1 ? 'les' : 'le'} dans "Gestion d'équipe > Mes prospects importés" pour les attribuer à votre équipe.`,
        link: '/team?tab=imports',
        metadata: {
          senderUid: callerUid,
          senderName,
          deadline: deadline || null,
          count
        }
      })

      if (targetManagerEmail) {
        const { sendProspectTransferEmail } = await import('@/lib/notification-emails')
        await sendProspectTransferEmail({
          to: targetManagerEmail,
          recipientName: targetManagerName,
          senderName,
          count,
          deadline: deadline || null
        })
      }
    } catch (notifErr) {
      console.warn('[migrate-senior-members] Erreur notification Team Manager:', notifErr)
    }

    return NextResponse.json({
      success: true,
      migratedCount: {
        pipeline: prospectDocsToTransfer.length,
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
