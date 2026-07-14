export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/crm/calls
 *
 * Enregistre un appel effectué par un agent support dans customer_calls.
 * Body: { clientId, clientName, clientPhone, status, notes, callType }
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

    if (!agentData || !['support_agent', 'manager', 'admin'].includes(agentData.role)) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { clientId, clientName, clientPhone, status, notes, callType, durationSeconds } = body

    if (!clientId || !clientPhone) {
      return NextResponse.json({ message: 'clientId et clientPhone sont requis' }, { status: 400 })
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
      console.error('[crm/calls client lookup]', e)
    }

    const validStatuses = ['connected', 'no_answer', 'busy', 'voicemail', 'failed']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ message: 'Statut invalide' }, { status: 400 })
    }

    const callDoc = {
      agentUid,
      agentName: agentData.name || agentData.email || 'Agent',
      agentAccessId: agentData.accessId || null,
      managerUid: clientManagerUid,
      companyId: agentData.companyId || null,
      clientId,
      clientName: clientName || '',
      clientPhone,
      status: status || 'connected',
      notes: notes || '',
      callType: callType || 'outgoing',
      durationSeconds: durationSeconds || 0,
      createdAt: new Date()
    }


    const docRef = await adminDb.collection('customer_calls').add(callDoc)

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 })
  } catch (error) {
    console.error('[crm/calls POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * GET /api/crm/calls?clientId=xxx
 *
 * Récupère l'historique des appels d'un client.
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
    if (!agentData || !['support_agent', 'manager', 'admin'].includes(agentData.role)) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ message: 'clientId requis' }, { status: 400 })

    const snap = await adminDb
      .collection('customer_calls')
      .where('clientId', '==', clientId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const calls = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null
    }))

    return NextResponse.json(calls)
  } catch (error) {
    console.error('[crm/calls GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
