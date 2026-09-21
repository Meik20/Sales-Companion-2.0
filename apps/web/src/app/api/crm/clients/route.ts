export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

function normalizeClientDoc(id: string, data: Record<string, any>, source: 'pipeline' | 'imported' | 'crm_clients') {
  const companyName = data.companyName ?? data.name ?? 'Sans nom'
  const contactName = data.contactName ?? data.contact ?? data.managerName ?? ''
  const phone = data.phone ?? data.companyPhone ?? ''
  const email = data.email ?? data.companyEmail ?? ''
  const city = data.city ?? data.companyCity ?? ''
  const sector = data.sector ?? data.companySector ?? ''
  const address = data.address ?? ''
  const postalCode = data.postalCode ?? ''
  const country = data.country ?? 'Cameroun'

  // Normalisation du statut
  let status = data.status ?? 'new'
  if (status === 'conclue' || status === 'conclusion') status = 'won'
  else if (status === 'imported') status = 'to_contact'

  const createdAt = data.createdAt?.toDate?.()?.toISOString() ?? (typeof data.createdAt === 'string' ? data.createdAt : null)
  const updatedAt = data.updatedAt?.toDate?.()?.toISOString() ?? (typeof data.updatedAt === 'string' ? data.updatedAt : null)
  const nextActionAt = data.nextActionAt?.toDate?.()?.toISOString() ?? (typeof data.nextActionAt === 'string' ? data.nextActionAt : (data.nextFollowUp?.toDate?.()?.toISOString() ?? data.nextFollowUp ?? null))
  const lastActivityAt = data.lastActivityAt?.toDate?.()?.toISOString() ?? (typeof data.lastActivityAt === 'string' ? data.lastActivityAt : null)

  return {
    id,
    companyName,
    contactName,
    phone,
    companyPhone: phone,
    email,
    companyEmail: email,
    city,
    companyCity: city,
    sector,
    companySector: sector,
    address,
    postalCode,
    country,
    status,
    owner: data.owner ?? data.managerUid ?? data.importedBy ?? data.userId ?? '',
    ownerName: data.ownerName ?? data.memberName ?? '',
    managerUid: data.managerUid ?? data.managerId ?? null,
    nextAction: data.nextAction ?? data.nextStep ?? '',
    nextActionAt,
    lastActivityAt,
    lastActivityType: data.lastActivityType ?? null,
    lastActivityTitle: data.lastActivityTitle ?? null,
    notes: data.notes ?? '',
    createdAt,
    updatedAt,
    _source: source
  }
}

/**
 * GET /api/crm/clients
 * Récupère tous les clients CRM avec priorisation intelligente
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let agentUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      agentUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const agentDoc = await adminDb.collection('users').doc(agentUid).get()
    const agentData = agentDoc.data()

    if (!agentData) {
      return NextResponse.json({ message: 'Profil introuvable' }, { status: 404 })
    }

    if (!['support_agent', 'manager', 'admin', 'independent', 'member'].includes(agentData.role)) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const seen = new Set<string>()
    const clients: any[] = []

    // 1. Clients dédiés CRM (crm_clients)
    let crmQuery = adminDb.collection('crm_clients') as any
    if (agentData.role === 'admin') {
      crmQuery = crmQuery.limit(1000)
    } else if (agentData.role === 'manager') {
      crmQuery = crmQuery.where('managerUid', '==', agentUid).limit(1000)
    } else {
      crmQuery = crmQuery.where('owner', '==', agentUid).limit(1000)
    }
    const crmSnap = await crmQuery.get()
    for (const doc of crmSnap.docs) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id)
        clients.push(normalizeClientDoc(doc.id, doc.data(), 'crm_clients'))
      }
    }

    // 2. Clients pipeline conclus
    let pipeQuery = adminDb.collection('pipeline') as any
    if (agentData.role === 'admin') {
      pipeQuery = pipeQuery.where('status', 'in', ['conclue', 'conclusion']).limit(1000)
    } else if (agentData.role === 'manager') {
      pipeQuery = pipeQuery.where('managerUid', '==', agentUid).where('status', 'in', ['conclue', 'conclusion']).limit(1000)
    } else if (agentData.role === 'support_agent') {
      const managerUids: string[] = [
        agentData.managerUid,
        ...(agentData.linkedManagerUids ?? [])
      ].filter(Boolean)

      if (managerUids.length > 0) {
        const pipeSnaps = await Promise.all(
          managerUids.map(uid =>
            adminDb.collection('pipeline')
              .where('managerUid', '==', uid)
              .where('status', 'in', ['conclue', 'conclusion'])
              .limit(500)
              .get()
          )
        )
        for (const snap of pipeSnaps) {
          for (const doc of snap.docs) {
            if (!seen.has(doc.id)) {
              seen.add(doc.id)
              clients.push(normalizeClientDoc(doc.id, doc.data(), 'pipeline'))
            }
          }
        }
      }
    }
    if (agentData.role === 'admin' || agentData.role === 'manager') {
      const pipeSnap = await pipeQuery.get()
      for (const doc of pipeSnap.docs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id)
          clients.push(normalizeClientDoc(doc.id, doc.data(), 'pipeline'))
        }
      }
    }

    // 3. Prospects importés pour support_agent / manager
    if (['support_agent', 'manager', 'admin'].includes(agentData.role)) {
      let impQuery = adminDb.collection('manager_prospects') as any
      if (agentData.role === 'support_agent') {
        impQuery = impQuery.where('importedBy', '==', agentUid).limit(1000)
      } else if (agentData.role === 'manager') {
        impQuery = impQuery.where('managerId', '==', agentUid).limit(1000)
      } else {
        impQuery = impQuery.limit(500)
      }
      const impSnap = await impQuery.get()
      for (const doc of impSnap.docs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id)
          clients.push(normalizeClientDoc(doc.id, doc.data(), 'imported'))
        }
      }
    }

    // ── Tri intelligent par urgence commerciale ─────────────────────────
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    clients.sort((a, b) => {
      const dateA = a.nextActionAt ? new Date(a.nextActionAt).getTime() : Infinity
      const dateB = b.nextActionAt ? new Date(b.nextActionAt).getTime() : Infinity

      // 1. Actions avec date planifiée en premier, du plus urgent au plus lointain
      if (dateA !== Infinity || dateB !== Infinity) {
        return dateA - dateB
      }

      // 2. Statut prioritaire : à contacter / nouveau en premier
      const priorityOrder: Record<string, number> = {
        to_contact: 1,
        new: 2,
        in_discussion: 3,
        proposal_sent: 4,
        contacted: 5,
        won: 6,
        lost: 7
      }
      const prioA = priorityOrder[a.status] ?? 99
      const prioB = priorityOrder[b.status] ?? 99
      if (prioA !== prioB) return prioA - prioB

      // 3. Date de création la plus récente
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return createdB - createdA
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('[crm/clients GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/crm/clients
 * Crée un nouveau client directement dans le CRM
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let agentUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      agentUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const agentDoc = await adminDb.collection('users').doc(agentUid).get()
    const agentData = agentDoc.data()
    if (!agentData) return NextResponse.json({ message: 'Profil introuvable' }, { status: 404 })

    const body = await request.json()
    const {
      companyName,
      contactName,
      phone,
      email,
      address,
      city,
      postalCode,
      country,
      sector,
      status,
      nextAction,
      nextActionAt,
      notes
    } = body

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ message: "Le nom de l'entreprise est requis" }, { status: 400 })
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ message: 'Le numéro de téléphone est requis' }, { status: 400 })
    }

    const now = Timestamp.now()
    const clientData: Record<string, any> = {
      companyName: companyName.trim(),
      contactName: (contactName ?? '').trim(),
      phone: phone.trim(),
      companyPhone: phone.trim(),
      email: (email ?? '').trim(),
      companyEmail: (email ?? '').trim(),
      address: (address ?? '').trim(),
      city: (city ?? '').trim(),
      companyCity: (city ?? '').trim(),
      postalCode: (postalCode ?? '').trim(),
      country: (country ?? 'Cameroun').trim(),
      sector: (sector ?? '').trim(),
      companySector: (sector ?? '').trim(),
      status: status || 'new',
      nextAction: (nextAction ?? '').trim(),
      nextActionAt: nextActionAt ? Timestamp.fromDate(new Date(nextActionAt)) : null,
      notes: (notes ?? '').trim(),
      owner: agentUid,
      ownerName: agentData.name || agentData.displayName || agentData.email || 'Utilisateur',
      managerUid: agentData.managerUid || (agentData.role === 'manager' ? agentUid : null),
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      lastActivityType: 'note',
      lastActivityTitle: 'Création du client dans le CRM'
    }

    const docRef = await adminDb.collection('crm_clients').add(clientData)

    // Enregistrer l'activité initiale
    await adminDb.collection('crm_activities').add({
      clientId: docRef.id,
      type: 'note',
      title: 'Création du client',
      description: `Client créé par ${clientData.ownerName}`,
      performedBy: agentUid,
      performedByName: clientData.ownerName,
      createdAt: now
    })

    return NextResponse.json(
      normalizeClientDoc(docRef.id, clientData, 'crm_clients')
    )
  } catch (error) {
    console.error('[crm/clients POST]', error)
    return NextResponse.json({ message: 'Erreur serveur lors de la création' }, { status: 500 })
  }
}
