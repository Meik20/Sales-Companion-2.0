import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

function normalizeStatus(status: string): 'prospection' | 'negociation' | 'conclue' | 'other' {
  if (['prospection', 'prospect'].includes(status)) return 'prospection'
  if (['negociation', 'negotiation'].includes(status)) return 'negociation'
  if (['conclue', 'conclusion'].includes(status)) return 'conclue'
  return 'other'
}

function getMonthKey(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const managerDoc = await adminDb.collection('users').doc(decoded.uid).get()
    if (managerDoc.data()?.role !== 'manager') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Get all pipeline items for this manager's team
    const pipelineSnap = await adminDb
      .collection('pipeline')
      .where('managerUid', '==', decoded.uid)
      .get()

    const items = pipelineSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

    // Get team members for name resolution
    const membersSnap = await adminDb
      .collection('team_accesses')
      .where('managerUid', '==', decoded.uid)
      .where('activated', '==', true)
      .get()

    const membersMap: Record<string, string> = {}
    membersSnap.docs.forEach(d => {
      const data = d.data()
      if (data.uid) {
        membersMap[data.uid] = `${data.firstname} ${data.lastname}`
      }
    })

    // Global stats
    const totalProspection = items.filter(i => normalizeStatus(i.status) === 'prospection').length
    const totalNegociation = items.filter(i => normalizeStatus(i.status) === 'negociation').length
    const totalConclue = items.filter(i => normalizeStatus(i.status) === 'conclue').length
    const totalItems = items.length
    const overallConversionRate = totalItems > 0 ? Math.round((totalConclue / totalItems) * 100) : 0

    // Stats per member
    const memberGroups: Record<string, any[]> = {}
    items.forEach(item => {
      const uid = item.userId || item.assignedTo || 'manager'
      if (!memberGroups[uid]) memberGroups[uid] = []
      memberGroups[uid].push(item)
    })

    const memberStats = Object.entries(memberGroups).map(([uid, memberItems]) => {
      const p = memberItems.filter(i => normalizeStatus(i.status) === 'prospection').length
      const n = memberItems.filter(i => normalizeStatus(i.status) === 'negociation').length
      const c = memberItems.filter(i => normalizeStatus(i.status) === 'conclue').length
      const total = memberItems.length
      return {
        uid,
        name: membersMap[uid] || (uid === decoded.uid ? 'Manager' : uid.slice(0, 8)),
        prospection: p,
        negociation: n,
        conclue: c,
        total,
        conversionRate: total > 0 ? Math.round((c / total) * 100) : 0
      }
    }).sort((a, b) => b.conclue - a.conclue)

    const topPerformer = memberStats[0]?.name ?? null

    // Monthly trend (last 6 months)
    const now = new Date()
    const last6Months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      last6Months.push(getMonthKey(d))
    }

    const monthlyMap: Record<string, { conclue: number; total: number }> = {}
    last6Months.forEach(m => { monthlyMap[m] = { conclue: 0, total: 0 } })

    items.forEach(item => {
      const createdAt = item.createdAt?.toDate?.() ?? (item.createdAt ? new Date(item.createdAt) : null)
      if (!createdAt) return
      const key = getMonthKey(createdAt)
      if (monthlyMap[key] !== undefined) {
        monthlyMap[key].total++
        if (normalizeStatus(item.status) === 'conclue') monthlyMap[key].conclue++
      }
    })

    const monthlyTrend = last6Months.map(month => ({
      month,
      ...monthlyMap[month]
    }))

    // Support Activity - query and sort in JS to prevent Firestore index errors
    const callsSnap = await adminDb
      .collection('customer_calls')
      .where('managerUid', '==', decoded.uid)
      .get()

    const ticketsSnap = await adminDb
      .collection('customer_tickets')
      .where('managerUid', '==', decoded.uid)
      .get()

    const allCalls = callsSnap.docs.map(doc => {
      const d = doc.data()
      return {
        id: doc.id,
        ...d,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? (d.createdAt ? new Date(d.createdAt).toISOString() : null)
      }
    }) as any[]
    const recentCalls = allCalls
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      })
      .slice(0, 50)

    const allTickets = ticketsSnap.docs.map(doc => {
      const d = doc.data()
      return {
        id: doc.id,
        ...d,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? (d.createdAt ? new Date(d.createdAt).toISOString() : null),
        updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? (d.updatedAt ? new Date(d.updatedAt).toISOString() : null)
      }
    }) as any[]

    const recentTickets = allTickets
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      })
      .slice(0, 50)

    const supportCallsCount = allCalls.length
    const supportTicketsCount = allTickets.length
    const resolvedTicketsCount = allTickets.filter(t => ['resolved', 'closed'].includes(t.status || '')).length
    const openTicketsCount = allTickets.filter(t => ['open', 'in_progress'].includes(t.status || '')).length

    return NextResponse.json({
      totalItems,
      totalProspection,
      totalNegociation,
      totalConclue,
      overallConversionRate,
      topPerformer,
      memberStats,
      monthlyTrend,
      supportStats: {
        callsCount: supportCallsCount,
        ticketsCount: supportTicketsCount,
        resolvedTicketsCount,
        openTicketsCount,
        recentCalls,
        recentTickets
      }
    })

  } catch (err: any) {
    console.error('[/api/reporting]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
