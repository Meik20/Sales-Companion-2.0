export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/crm/tickets?clientId=xxx
 * POST /api/crm/tickets
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let uid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      uid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // Charger le profil du caller pour contrôler les accès
    const callerDoc = await adminDb.collection('users').doc(uid).get()
    const callerData = callerDoc.data()
    const callerRole = callerData?.role as string | undefined
    if (callerRole === 'manager' && !hasActivePaidManagerAccess(callerData)) {
      return NextResponse.json({ message: 'Un abonnement Manager actif et vérifié est requis.' }, { status: 403 })
    }

    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ message: 'clientId requis' }, { status: 400 })

    // ── Contrôle d'accès : vérifier que le caller appartient à la même org que le client ──
    if (callerRole !== 'admin') {
      // Résoudre le managerUid du client (depuis pipeline ou crm_clients)
      let clientManagerUid: string | null = null
      try {
        const pipeDoc = await adminDb.collection('pipeline').doc(clientId).get()
        if (pipeDoc.exists) {
          clientManagerUid = pipeDoc.data()?.managerUid ?? null
        }
        if (!clientManagerUid) {
          const crmDoc = await adminDb.collection('crm_clients').doc(clientId).get()
          if (crmDoc.exists) {
            clientManagerUid = crmDoc.data()?.managerUid ?? null
          }
        }
      } catch (e) {
        console.error('[crm/tickets GET] client lookup error', e)
      }

      // Vérifier l'appartenance à l'org
      const isOwnerManager = callerRole === 'manager' && uid === clientManagerUid
      const linkedManagerUids: string[] = callerData?.linkedManagerUids ?? []
      const isLinkedAgent =
        callerRole === 'support_agent' &&
        clientManagerUid != null &&
        (callerData?.managerUid === clientManagerUid || linkedManagerUids.includes(clientManagerUid))
      const isOwnAgent = callerRole === 'support_agent' && uid === clientManagerUid

      if (!isOwnerManager && !isLinkedAgent && !isOwnAgent) {
        return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
      }
    }

    const snap = await adminDb
      .collection('customer_tickets')
      .where('clientId', '==', clientId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const tickets = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null
    }))

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('[crm/tickets GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

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
    if (agentData?.role === 'manager' && !hasActivePaidManagerAccess(agentData)) {
      return NextResponse.json({ message: 'Un abonnement Manager actif et vérifié est requis.' }, { status: 403 })
    }
    if (!agentData || !['support_agent', 'manager', 'admin'].includes(agentData.role)) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { clientId, clientName, subject, description, priority } = body

    if (!clientId || !subject) {
      return NextResponse.json({ message: 'clientId et subject sont requis' }, { status: 400 })
    }

    // Sécurisation / association : récupérer le vrai managerUid du client
    let clientManagerUid = agentData.managerUid || agentUid
    try {
      const clientDoc = await adminDb.collection('pipeline').doc(clientId).get()
      if (clientDoc.exists) {
        const clientData = clientDoc.data()
        if (clientData?.managerUid) {
          clientManagerUid = clientData.managerUid
        }
      }
    } catch (e) {
      console.error('[crm/tickets client lookup]', e)
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent']
    const ticketDoc = {
      clientId,
      clientName: clientName || '',
      subject,
      description: description || '',
      priority: validPriorities.includes(priority) ? priority : 'medium',
      status: 'open',
      agentUid,
      agentName: agentData.name || agentData.email,
      managerUid: clientManagerUid,
      companyId: agentData.companyId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }


    const docRef = await adminDb.collection('customer_tickets').add(ticketDoc)
    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 })
  } catch (error) {
    console.error('[crm/tickets POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
