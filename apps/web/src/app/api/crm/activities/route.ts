export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/crm/activities?clientId=...
 * Retourne la timeline unifiée des activités pour un client donné
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    try {
      await adminAuth.verifyIdToken(token)
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ message: 'clientId requis' }, { status: 400 })
    }

    const activities: any[] = []

    // 1. Activités directes (notes, réunions, WhatsApp, propositions, changements statut)
    const actSnap = await adminDb
      .collection('crm_activities')
      .where('clientId', '==', clientId)
      .limit(100)
      .get()

    for (const doc of actSnap.docs) {
      const d = doc.data()
      activities.push({
        id: doc.id,
        clientId,
        type: d.type ?? 'note',
        title: d.title ?? 'Activité',
        description: d.description ?? '',
        performedBy: d.performedBy ?? '',
        performedByName: d.performedByName ?? 'Commercial',
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? (typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString())
      })
    }

    // 2. Appels passés (customer_calls)
    const callsSnap = await adminDb
      .collection('customer_calls')
      .where('clientId', '==', clientId)
      .limit(100)
      .get()

    for (const doc of callsSnap.docs) {
      const d = doc.data()
      const statusText = d.status === 'connected' ? 'Connecté' : d.status === 'no_answer' ? 'Pas de réponse' : d.status
      activities.push({
        id: doc.id,
        clientId,
        type: 'call',
        title: `Appel téléphonique (${statusText})`,
        description: d.notes || `Durée: ${d.durationSeconds || 0}s`,
        performedBy: d.agentUid,
        performedByName: d.agentName || 'Commercial',
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? (typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString())
      })
    }

    // 3. Tickets support (customer_tickets)
    const ticketsSnap = await adminDb
      .collection('customer_tickets')
      .where('clientId', '==', clientId)
      .limit(100)
      .get()

    for (const doc of ticketsSnap.docs) {
      const d = doc.data()
      activities.push({
        id: doc.id,
        clientId,
        type: 'proposal',
        title: `Ticket Support : ${d.subject}`,
        description: d.description,
        performedBy: d.agentUid,
        performedByName: d.agentName || 'Agent Support',
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? (typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString())
      })
    }

    // Trier la timeline par date décroissante
    activities.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime()
      const tb = new Date(b.createdAt).getTime()
      return tb - ta
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('[crm/activities GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/crm/activities
 * Enregistre une nouvelle activité pour un client
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let userUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const userDoc = await adminDb.collection('users').doc(userUid).get()
    const userData = userDoc.data()
    const userName = userData?.name || userData?.displayName || userData?.email || 'Commercial'

    const body = await request.json()
    const { clientId, type, title, description } = body

    if (!clientId || !title) {
      return NextResponse.json({ message: 'clientId et title requis' }, { status: 400 })
    }

    const now = Timestamp.now()
    const actRef = await adminDb.collection('crm_activities').add({
      clientId,
      type: type || 'note',
      title: title.trim(),
      description: (description ?? '').trim(),
      performedBy: userUid,
      performedByName: userName,
      createdAt: now
    })

    // Mettre à jour la dernière activité sur le client
    const clientUpdates = {
      lastActivityAt: now,
      lastActivityType: type || 'note',
      lastActivityTitle: title.trim(),
      updatedAt: now
    }

    // Tenter la mise à jour sur la bonne collection
    try {
      const crmRef = adminDb.collection('crm_clients').doc(clientId)
      const crmSnap = await crmRef.get()
      if (crmSnap.exists) {
        await crmRef.update(clientUpdates)
      } else {
        const pipeRef = adminDb.collection('pipeline').doc(clientId)
        const pipeSnap = await pipeRef.get()
        if (pipeSnap.exists) {
          await pipeRef.update(clientUpdates)
        } else {
          const impRef = adminDb.collection('manager_prospects').doc(clientId)
          const impSnap = await impRef.get()
          if (impSnap.exists) {
            await impRef.update(clientUpdates)
          }
        }
      }
    } catch (err) {
      console.error('[update client lastActivity error]', err)
    }

    return NextResponse.json({
      id: actRef.id,
      clientId,
      type: type || 'note',
      title: title.trim(),
      description: (description ?? '').trim(),
      performedBy: userUid,
      performedByName: userName,
      createdAt: now.toDate().toISOString()
    })
  } catch (error) {
    console.error('[crm/activities POST]', error)
    return NextResponse.json({ message: 'Erreur serveur lors de la création' }, { status: 500 })
  }
}
