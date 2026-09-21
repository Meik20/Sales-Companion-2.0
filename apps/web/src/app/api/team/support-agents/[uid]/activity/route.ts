export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

/**
 * GET /api/team/support-agents/[uid]/activity
 * Retourne l'activité complète (appels, tickets, actions CRM) d'un agent support pour le manager
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const managerDoc = await adminDb.collection('users').doc(decoded.uid).get()
    const userRole = managerDoc.data()?.role

    if (!['manager', 'admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (!uid) {
      return NextResponse.json({ error: 'UID requis' }, { status: 400 })
    }

    // 1. Récupérer les informations de l'agent
    let agentName = 'Agent Support'
    let agentEmail = ''
    let agentAccessId = ''

    const userDoc = await adminDb.collection('users').doc(uid).get()
    if (userDoc.exists) {
      const uData = userDoc.data()
      agentName = uData?.name || uData?.displayName || agentName
      agentEmail = uData?.email || ''
      agentAccessId = uData?.accessId || ''
    } else {
      // Chercher dans team_accesses
      const accessSnap = await adminDb
        .collection('team_accesses')
        .where('managerUid', '==', decoded.uid)
        .where('firebaseUid', '==', uid)
        .limit(1)
        .get()

      const firstDoc = accessSnap.docs[0]
      if (firstDoc) {
        const aData = firstDoc.data()
        agentName = [aData?.firstname, aData?.lastname].filter(Boolean).join(' ') || aData?.name || agentName
        agentEmail = aData?.email || ''
        agentAccessId = aData?.accessId || ''
      }
    }

    // 2. Appels passés par cet agent
    const callsSnap = await adminDb
      .collection('customer_calls')
      .where('managerUid', '==', decoded.uid)
      .get()

    const allCalls = callsSnap.docs
      .map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          ...d,
          createdAt: d.createdAt?.toDate?.()?.toISOString() ?? (d.createdAt ? new Date(d.createdAt).toISOString() : null)
        }
      })
      .filter((c: any) => c.agentUid === uid || (agentAccessId && c.agentAccessId === agentAccessId) || (agentName && c.agentName === agentName))
      .sort((a: any, b: any) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })

    // 3. Tickets traités par cet agent
    const ticketsSnap = await adminDb
      .collection('customer_tickets')
      .where('managerUid', '==', decoded.uid)
      .get()

    const allTickets = ticketsSnap.docs
      .map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          ...d,
          createdAt: d.createdAt?.toDate?.()?.toISOString() ?? (d.createdAt ? new Date(d.createdAt).toISOString() : null),
          updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? (d.updatedAt ? new Date(d.updatedAt).toISOString() : null)
        }
      })
      .filter((t: any) => t.agentUid === uid || (agentName && t.agentName === agentName))
      .sort((a: any, b: any) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })

    // 4. Activités CRM (notes, devis, statuts) réalisées par cet agent
    let crmActivities: any[] = []
    try {
      const crmSnap = await adminDb
        .collection('crm_activities')
        .where('performedBy', '==', uid)
        .limit(50)
        .get()

      crmActivities = crmSnap.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          ...d,
          createdAt: d.createdAt?.toDate?.()?.toISOString() ?? (d.createdAt ? new Date(d.createdAt).toISOString() : null)
        }
      }).sort((a: any, b: any) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })
    } catch (e) {
      console.warn('[support agent crm_activities lookup]', e)
    }

    // Calcul des KPIs de cet agent
    const callsCount = allCalls.length
    const ticketsCount = allTickets.length
    const resolvedTicketsCount = allTickets.filter((t: any) => ['resolved', 'closed'].includes(t.status || '')).length
    const openTicketsCount = allTickets.filter((t: any) => ['open', 'in_progress'].includes(t.status || '')).length
    const resolutionRate = ticketsCount > 0 ? Math.round((resolvedTicketsCount / ticketsCount) * 100) : 0

    return NextResponse.json({
      agent: {
        uid,
        name: agentName,
        email: agentEmail,
        accessId: agentAccessId
      },
      kpis: {
        callsCount,
        ticketsCount,
        resolvedTicketsCount,
        openTicketsCount,
        crmActivitiesCount: crmActivities.length,
        resolutionRate
      },
      recentCalls: allCalls.slice(0, 30),
      recentTickets: allTickets.slice(0, 30),
      recentCrmActivities: crmActivities.slice(0, 30)
    })
  } catch (error: any) {
    console.error('[/api/team/support-agents/[uid]/activity]', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
