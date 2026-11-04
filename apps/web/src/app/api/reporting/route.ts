import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'
import { getCurrentCycleContext, getMonthPeriodInfo } from '@/lib/monthly-cycle'
import { normalizePipelineStatus as normalizeStatus } from '@/lib/pipeline-metrics'

function getMonthKey(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const managerDoc = await adminDb.collection('users').doc(decoded.uid).get()
    if (!hasActivePaidManagerAccess(managerDoc.data())) {
      return NextResponse.json(
        { error: 'Un abonnement Manager actif et vérifié est requis.' },
        { status: 403 }
      )
    }

    // Get both pipeline items and archived clients for this manager's team
    const [pipelineSnap, clientsSnap] = await Promise.all([
      adminDb.collection('pipeline').where('managerUid', '==', decoded.uid).get(),
      adminDb.collection('clients').where('managerUid', '==', decoded.uid).get()
    ])

    // Get team members for name resolution and active team scope
    const membersSnap = await adminDb
      .collection('team_accesses')
      .where('managerUid', '==', decoded.uid)
      .where('activated', '==', true)
      .get()

    // Map commercial members only (exclude support agents, managers, etc.)
    type MemberInfo = { name: string; accessId: string; canonicalUid: string }
    const membersMap: Record<string, MemberInfo> = {}
    const canonicalMembers: Array<{ uid: string; name: string; accessId: string }> = []
    const activeMemberIds = new Set<string>()

    membersSnap.docs.forEach((d) => {
      const data = d.data()
      if (data.role === 'support_agent') return // Exclude support agents

      const fullName =
        [data.firstname, data.lastname].filter(Boolean).join(' ') ||
        data.name ||
        data.email ||
        'Commercial'
      const accessId = data.accessId || d.id
      const canonicalUid = data.firebaseUid || data.uid || d.id

      const info: MemberInfo = { name: fullName, accessId, canonicalUid }
      canonicalMembers.push({ uid: canonicalUid, name: fullName, accessId })

      if (data.firebaseUid) {
        membersMap[data.firebaseUid] = info
        activeMemberIds.add(data.firebaseUid)
      }
      if (data.uid) {
        membersMap[data.uid] = info
        activeMemberIds.add(data.uid)
      }
      if (accessId) {
        membersMap[accessId] = info
        activeMemberIds.add(accessId)
      }
      membersMap[d.id] = info
      activeMemberIds.add(d.id)
    })

    // Parse optional period query param (defaults to current month YYYY-MM)
    const { searchParams } = new URL(request.url)
    const reqPeriod = searchParams.get('period')
    const activeMonthPeriod = reqPeriod || new Date().toISOString().slice(0, 7)

    let periodBounds: { start: Date; end: Date } | null = null
    if (activeMonthPeriod) {
      const parts = activeMonthPeriod.split('-').map(Number)
      if (parts[0] && parts[1]) {
        periodBounds = {
          start: new Date(parts[0], parts[1] - 1, 1, 0, 0, 0, 0),
          end: new Date(parts[0], parts[1], 0, 23, 59, 59, 999)
        }
      }
    }

    const isConcludedInPeriod = (item: any): boolean => {
      if (!periodBounds) return true
      const rawDate =
        item.concludedAt?.toDate?.() ??
        (item.concludedAt ? new Date(item.concludedAt) : null) ??
        item.updatedAt?.toDate?.() ??
        (item.updatedAt ? new Date(item.updatedAt) : null) ??
        item.createdAt?.toDate?.() ??
        (item.createdAt ? new Date(item.createdAt) : null)
      if (!rawDate) return false
      const d = rawDate instanceof Date ? rawDate : new Date(rawDate)
      return !isNaN(d.getTime()) && d >= periodBounds.start && d <= periodBounds.end
    }

    // Get team targets for this manager
    const targetsSnap = await adminDb
      .collection('teamTargets')
      .where('managerUid', '==', decoded.uid)
      .get()

    const targetsByMember: Record<string, { targetVolume: number | null; targetValue: number | null }> = {}
    let totalTargetVolume = 0
    let totalTargetValue = 0

    targetsSnap.docs.forEach((doc) => {
      const d = doc.data()
      const mId = d.memberId
      // Filtrage strict : ignorer les cibles hors-période ou des membres n'appartenant plus à l'équipe
      if (d.period && d.period !== activeMonthPeriod) return
      if (mId && activeMemberIds.size > 0 && !activeMemberIds.has(mId)) return

      if (mId) {
        targetsByMember[mId] = {
          targetVolume: typeof d.targetVolume === 'number' ? d.targetVolume : null,
          targetValue: typeof d.targetValue === 'number' ? d.targetValue : null
        }
        if (typeof d.targetVolume === 'number') totalTargetVolume += d.targetVolume
        if (typeof d.targetValue === 'number') totalTargetValue += d.targetValue
      }
    })

    const seenItemIds = new Set<string>()
    const items: any[] = []

    pipelineSnap.docs.forEach((d) => {
      seenItemIds.add(d.id)
      items.push({ id: d.id, ...d.data() })
    })

    clientsSnap.docs.forEach((d) => {
      const data = d.data()
      const originalId = data.pipelineItemId || d.id.replace(/^client_/, '')
      if (!seenItemIds.has(originalId)) {
        seenItemIds.add(originalId)
        items.push({
          id: originalId,
          ...data,
          status: 'conclue',
          concludedAt: data.concludedAt,
          amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0
        })
      }
    })

    // Global stats: prospection and negociation represent ongoing active pipeline
    const totalProspection = items.filter((i) => normalizeStatus(i.status) === 'prospection').length
    const totalNegociation = items.filter((i) => normalizeStatus(i.status) === 'negociation').length

    // Concluded deals are strictly filtered by the selected period
    const periodConcludedItems = items.filter(
      (i) => normalizeStatus(i.status) === 'conclue' && isConcludedInPeriod(i)
    )
    const totalConclue = periodConcludedItems.length
    const totalItems = totalProspection + totalNegociation + totalConclue
    const overallConversionRate = totalItems > 0 ? Math.round((totalConclue / totalItems) * 100) : 0

    // Financial revenue stats (Total revenue from closed deals in selected period)
    const totalRevenue = periodConcludedItems.reduce(
      (acc, i) => acc + (typeof i.amount === 'number' ? i.amount : Number(i.amount) || 0),
      0
    )

    const pipelineValue = items
      .filter(
        (i) =>
          normalizeStatus(i.status) === 'negociation' || normalizeStatus(i.status) === 'prospection'
      )
      .reduce(
        (acc, i) => acc + (typeof i.amount === 'number' ? i.amount : Number(i.amount) || 0),
        0
      )

    // Overdue follow-ups count
    const nowIso = new Date().toISOString().slice(0, 10)
    const totalOverdueFollowUps = items.filter((i) => {
      if (!i.nextFollowUp) return false
      return i.nextFollowUp < nowIso && normalizeStatus(i.status) !== 'conclue'
    }).length

    // Stats per commercial member ONLY
    // Initialize groups for active commercial members
    const memberGroups: Record<string, any[]> = {}
    canonicalMembers.forEach((m) => {
      memberGroups[m.uid] = []
    })

    // Assign pipeline items ONLY if they are assigned to an actual commercial member
    items.forEach((item) => {
      const assignedTo = item.assignedTo
      // An item is NOT assigned to a commercial if:
      // - assignedTo is falsy (unassigned prospect in manager's pool)
      // - assignedTo is the manager themselves (transferred to or owned by the manager)
      if (!assignedTo || assignedTo === decoded.uid) {
        return
      }

      const memberInfo = membersMap[assignedTo]
      if (memberInfo) {
        const cUid = memberInfo.canonicalUid
        if (!memberGroups[cUid]) {
          memberGroups[cUid] = []
        }
        memberGroups[cUid].push(item)
      }
    })

    const memberStats = canonicalMembers
      .map((m) => {
        const memberItems = memberGroups[m.uid] ?? []
        const p = memberItems.filter((i) => normalizeStatus(i.status) === 'prospection').length
        const n = memberItems.filter((i) => normalizeStatus(i.status) === 'negociation').length
        const memberConcluded = memberItems.filter(
          (i) => normalizeStatus(i.status) === 'conclue' && isConcludedInPeriod(i)
        )
        const c = memberConcluded.length
        const total = p + n + c

        const memberRevenue = memberConcluded.reduce(
          (acc, i) => acc + (typeof i.amount === 'number' ? i.amount : Number(i.amount) || 0),
          0
        )

        const memberPipelineValue = memberItems
          .filter(
            (i) =>
              normalizeStatus(i.status) === 'negociation' ||
              normalizeStatus(i.status) === 'prospection'
          )
          .reduce(
            (acc, i) => acc + (typeof i.amount === 'number' ? i.amount : Number(i.amount) || 0),
            0
          )

        const overdueFollowUps = memberItems.filter((i) => {
          if (!i.nextFollowUp) return false
          return i.nextFollowUp < nowIso && normalizeStatus(i.status) !== 'conclue'
        }).length

        const memberTarget = targetsByMember[m.uid] || targetsByMember[m.accessId]
        const targetVol = memberTarget?.targetVolume ?? null
        const targetVal = memberTarget?.targetValue ?? null
        const volRate = targetVol && targetVol > 0 ? Math.round((c / targetVol) * 100) : null
        const valRate = targetVal && targetVal > 0 ? Math.round((memberRevenue / targetVal) * 100) : null

        return {
          uid: m.uid,
          name: m.name,
          accessId: m.accessId || '',
          prospection: p,
          negociation: n,
          conclue: c,
          total,
          conversionRate: total > 0 ? Math.round((c / total) * 100) : 0,
          revenue: memberRevenue,
          pipelineValue: memberPipelineValue,
          overdueFollowUps,
          targetVolume: targetVol,
          targetValue: targetVal,
          volumeAttainmentRate: volRate,
          valueAttainmentRate: valRate,
          deals: memberItems.map((item) => ({
            id: item.id,
            companyName: item.companyName || item.name || 'Prospect',
            status: item.status,
            amount: typeof item.amount === 'number' ? item.amount : Number(item.amount) || 0,
            companyCity: item.companyCity || '',
            companySector: item.companySector || '',
            companyPhone: item.companyPhone || '',
            nextFollowUp: item.nextFollowUp || null,
            createdAt:
              item.createdAt?.toDate?.()?.toISOString() ??
              (item.createdAt ? new Date(item.createdAt).toISOString() : null)
          }))
        }
      })
      .sort((a, b) => b.conclue - a.conclue || b.revenue - a.revenue || b.total - a.total)

    const topPerformer =
      memberStats.length > 0 && (memberStats[0]?.conclue ?? 0) > 0
        ? (memberStats[0]?.name ?? null)
        : null

    // Monthly trend (last 6 months)
    const now = new Date()
    const last6Months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      last6Months.push(getMonthKey(d))
    }

    const monthlyMap: Record<string, { conclue: number; total: number }> = {}
    last6Months.forEach((m) => {
      monthlyMap[m] = { conclue: 0, total: 0 }
    })

    items.forEach((item) => {
      const createdAt =
        item.createdAt?.toDate?.() ?? (item.createdAt ? new Date(item.createdAt) : null)
      if (!createdAt) return
      const key = getMonthKey(createdAt)
      if (monthlyMap[key] !== undefined) {
        monthlyMap[key].total++
        if (normalizeStatus(item.status) === 'conclue') monthlyMap[key].conclue++
      }
    })

    const monthlyTrend = last6Months.map((month) => ({
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

    const allCalls = callsSnap.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        ...d,
        createdAt:
          d.createdAt?.toDate?.()?.toISOString() ??
          (d.createdAt ? new Date(d.createdAt).toISOString() : null)
      }
    }) as any[]
    const recentCalls = allCalls
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      })
      .slice(0, 100)

    const allTickets = ticketsSnap.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        ...d,
        createdAt:
          d.createdAt?.toDate?.()?.toISOString() ??
          (d.createdAt ? new Date(d.createdAt).toISOString() : null),
        updatedAt:
          d.updatedAt?.toDate?.()?.toISOString() ??
          (d.updatedAt ? new Date(d.updatedAt).toISOString() : null)
      }
    }) as any[]

    const recentTickets = allTickets
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      })
      .slice(0, 100)

    // Discover all support agents (from team_accesses, support_links, and call/ticket history)
    const supportAgentsMap = new Map<string, { uid: string; name: string; email?: string }>()

    membersSnap.docs.forEach((d) => {
      const data = d.data()
      if (data.role === 'support_agent') {
        const fullName =
          [data.firstname, data.lastname].filter(Boolean).join(' ') ||
          data.name ||
          data.email ||
          'Agent Support'
        const uid = data.firebaseUid || data.uid || d.id
        supportAgentsMap.set(uid, {
          uid,
          name: fullName,
          email: data.email
        })
      }
    })

    // Also check cross-team support links
    try {
      const supportLinksSnap = await adminDb
        .collection('support_links')
        .where('managerUid', '==', decoded.uid)
        .where('status', '==', 'active')
        .get()
      supportLinksSnap.docs.forEach((doc) => {
        const d = doc.data()
        if (d.agentUid && !supportAgentsMap.has(d.agentUid)) {
          supportAgentsMap.set(d.agentUid, {
            uid: d.agentUid,
            name: d.agentName || 'Agent Support',
            email: d.agentEmail
          })
        }
      })
    } catch (e) {
      console.warn('[reporting support_links lookup]', e)
    }

    // Add any agents from calls or tickets not already detected
    allCalls.forEach((call) => {
      if (call.agentUid && !supportAgentsMap.has(call.agentUid)) {
        supportAgentsMap.set(call.agentUid, {
          uid: call.agentUid,
          name: call.agentName || 'Agent Support'
        })
      }
    })

    allTickets.forEach((ticket) => {
      if (ticket.agentUid && !supportAgentsMap.has(ticket.agentUid)) {
        supportAgentsMap.set(ticket.agentUid, {
          uid: ticket.agentUid,
          name: ticket.agentName || 'Agent Support'
        })
      }
    })

    // Compute stats per support agent
    const agentsBreakdown = Array.from(supportAgentsMap.values())
      .map((agent) => {
        const agentCalls = allCalls.filter(
          (c) => c.agentUid === agent.uid || c.agentName === agent.name
        )
        const agentTickets = allTickets.filter(
          (t) => t.agentUid === agent.uid || t.agentName === agent.name
        )
        const resolvedCount = agentTickets.filter((t) =>
          ['resolved', 'closed'].includes(t.status || '')
        ).length
        const openCount = agentTickets.filter((t) =>
          ['open', 'in_progress'].includes(t.status || '')
        ).length
        const resolutionRate =
          agentTickets.length > 0 ? Math.round((resolvedCount / agentTickets.length) * 100) : 0

        return {
          uid: agent.uid,
          name: agent.name,
          email: agent.email,
          callsCount: agentCalls.length,
          ticketsCount: agentTickets.length,
          resolvedTicketsCount: resolvedCount,
          openTicketsCount: openCount,
          resolutionRate
        }
      })
      .sort((a, b) => b.callsCount + b.ticketsCount - (a.callsCount + a.ticketsCount))

    const supportCallsCount = allCalls.length
    const supportTicketsCount = allTickets.length
    const resolvedTicketsCount = allTickets.filter((t) =>
      ['resolved', 'closed'].includes(t.status || '')
    ).length
    const openTicketsCount = allTickets.filter((t) =>
      ['open', 'in_progress'].includes(t.status || '')
    ).length

    const volumeAttainmentRate =
      totalTargetVolume > 0 ? Math.round((totalConclue / totalTargetVolume) * 100) : null
    const valueAttainmentRate =
      totalTargetValue > 0 ? Math.round((totalRevenue / totalTargetValue) * 100) : null

    const cycleContext = getCurrentCycleContext()
    const [selYear, selMonth] = activeMonthPeriod.split('-').map(Number)
    const selectedPeriodInfo =
      selYear && selMonth ? getMonthPeriodInfo(selYear, selMonth) : cycleContext.currentPeriod

    return NextResponse.json({
      totalItems,
      totalProspection,
      totalNegociation,
      totalConclue,
      overallConversionRate,
      totalRevenue,
      pipelineValue,
      totalOverdueFollowUps,
      topPerformer,
      targets: {
        targetVolume: totalTargetVolume > 0 ? totalTargetVolume : null,
        targetValue: totalTargetValue > 0 ? totalTargetValue : null,
        volumeRealized: totalConclue,
        valueRealized: totalRevenue,
        volumeAttainmentRate,
        valueAttainmentRate
      },
      monthlyCycle: {
        ...cycleContext,
        currentPeriod: selectedPeriodInfo
      },
      memberStats,
      monthlyTrend,
      supportStats: {
        callsCount: supportCallsCount,
        ticketsCount: supportTicketsCount,
        resolvedTicketsCount,
        openTicketsCount,
        recentCalls,
        recentTickets,
        agentsBreakdown
      }
    })
  } catch (err: any) {
    console.error('[/api/reporting]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
