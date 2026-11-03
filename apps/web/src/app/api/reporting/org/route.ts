import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'
import { getCurrentCycleContext, getMonthPeriodInfo } from '@/lib/monthly-cycle'
import { normalizePipelineStatus as normalizeStatus, calculateAttainmentRate } from '@/lib/pipeline-metrics'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/reporting/org
 * Retourne les KPIs consolidés de l'organisation pour le Senior Manager.
 * Agrège les pipelines de tous les managers partageant le même orgCode.
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const callerDoc = await adminDb.collection('users').doc(decoded.uid).get()
    const callerData = callerDoc.data()
    if (!callerDoc.exists || !callerData)
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    if (callerData.role !== 'manager' || callerData.orgRole !== 'senior_manager') {
      return NextResponse.json({ error: 'Accès réservé au Senior Manager' }, { status: 403 })
    }

    const orgCode = callerData.orgCode
    if (!orgCode) {
      return NextResponse.json({ error: 'Aucun code organisation trouvé' }, { status: 404 })
    }

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
        (item.updatedAt ? new Date(item.updatedAt) : null)
      if (!rawDate) return false
      const d = rawDate instanceof Date ? rawDate : new Date(rawDate)
      return !isNaN(d.getTime()) && d >= periodBounds.start && d <= periodBounds.end
    }

    // 1. Récupérer tous les managers de l'org
    const managersSnap = await adminDb
      .collection('users')
      .where('orgCode', '==', orgCode)
      .where('role', '==', 'manager')
      .get()

    const callerSegment = callerData.segment || null
    const filteredManagersDocs = callerSegment
      ? managersSnap.docs.filter((d) => {
          const mData = d.data()
          return (
            d.id === decoded.uid ||
            mData.seniorManagerUid === decoded.uid ||
            mData.segment === callerSegment
          )
        })
      : managersSnap.docs

    const managerUids = filteredManagersDocs.map((d) => d.id)
    const managersMap: Record<
      string,
      { name: string; email: string; orgRole: string; isSenior: boolean; segment?: string | null }
    > = {}
    filteredManagersDocs.forEach((d) => {
      const m = d.data()
      managersMap[d.id] = {
        name: m.displayName || m.name || m.email || d.id,
        email: m.email || '',
        orgRole: m.orgRole || 'team_manager',
        isSenior: m.orgRole === 'senior_manager',
        segment: m.segment || null
      }
    })

    if (managerUids.length === 0) {
      return NextResponse.json({
        orgCode,
        managers: [],
        globalCounts: { prospection: 0, negociation: 0, conclue: 0, total: 0 },
        topPerformers: [],
        conversionRate: 0,
        recentActivity: []
      })
    }

    // 2. Agréger les pipelines (par batch de 10 pour Firestore)
    const allItems: any[] = []
    const chunks: string[][] = []
    for (let i = 0; i < managerUids.length; i += 10) {
      chunks.push(managerUids.slice(i, i + 10))
    }

    await Promise.all(
      chunks.map(async (chunk) => {
        const snap = await adminDb.collection('pipeline').where('managerUid', 'in', chunk).get()
        snap.docs.forEach((d) => {
          const data = d.data()
          // Strict multi-tenant guard: si la fiche a un orgCode explicite, il doit correspondre à celui de l'organisation
          if (data.orgCode && data.orgCode !== orgCode) {
            return
          }
          if (callerSegment && data.segment && data.segment !== callerSegment) {
            return
          }
          allItems.push({ id: d.id, ...data, orgCode: data.orgCode || orgCode })
        })
      })
    )

    // 3. Comptes globaux et montants
    // total est recalculé après la boucle (prospection + négociation + conclues filtrées par période)
    const globalCounts = { prospection: 0, negociation: 0, conclue: 0, perdue: 0, total: 0 }
    let totalConcludedAmount = 0
    let totalPipelineValue = 0
    let totalLostAmount = 0
    const lossReasonsSummary: Record<string, number> = {}

    for (const item of allItems) {
      const ns = normalizeStatus(item.status ?? '')
      const amt = typeof item.amount === 'number' ? item.amount : Number(item.amount) || 0
      if (ns === 'conclue') {
        if (isConcludedInPeriod(item)) {
          globalCounts.conclue++
          totalConcludedAmount += amt
        }
      } else if (ns === 'prospection') {
        globalCounts.prospection++
        totalPipelineValue += amt
      } else if (ns === 'negociation') {
        globalCounts.negociation++
        totalPipelineValue += amt
      } else if (ns === 'perdue') {
        globalCounts.perdue++
        totalLostAmount += amt
        const r = (item.lossReason as string) || 'other'
        lossReasonsSummary[r] = (lossReasonsSummary[r] || 0) + 1
      }
    }

    // Recalcul du total : prospection + négociation + conclues filtrées par période
    // (exclut les conclues hors-période encore en Firestore pendant le J+3)
    globalCounts.total = globalCounts.prospection + globalCounts.negociation + globalCounts.conclue

    // 4. Stats et CA par manager
    const statsByManager: Record<
      string,
      { prospection: number; negociation: number; conclue: number; perdue: number; total: number; concludedAmount: number }
    > = {}
    for (const uid of managerUids) {
      statsByManager[uid] = { prospection: 0, negociation: 0, conclue: 0, perdue: 0, total: 0, concludedAmount: 0 }
    }
    for (const item of allItems) {
      const uid = item.managerUid
      if (uid && statsByManager[uid]) {
        const ns = normalizeStatus(item.status ?? '')
        if (ns === 'conclue') {
          if (isConcludedInPeriod(item)) {
            statsByManager[uid].conclue++
            const amt = typeof item.amount === 'number' ? item.amount : Number(item.amount) || 0
            statsByManager[uid].concludedAmount += amt
          }
        } else if (ns === 'prospection' || ns === 'negociation' || ns === 'perdue') {
          statsByManager[uid][ns]++
        }
      }
    }
    // Recalcul du total par manager : cohérent avec globalCounts.total
    for (const uid of managerUids) {
      const s = statsByManager[uid]
      if (s) s.total = s.prospection + s.negociation + s.conclue
    }

    // 5. Récupérer les objectifs (teamTargets) pour tous les Team Managers du segment (hors Senior Manager) sur le mois en cours
    // RÈGLE PYRAMIDALE : La source de vérité est l'ensemble des commerciaux actifs sous contrat de chaque Team Manager
    const teamManagerUids = managerUids.filter((uid) => !managersMap[uid]?.isSenior)
    const targetsByManager: Record<string, { targetVolume: number; targetValue: number }> = {}
    let orgTargetVolume = 0
    let orgTargetValue = 0
    // Période active ciblée (par défaut mois civil M en cours, ou période historique demandée)
    const currentMonthPeriod = activeMonthPeriod

    try {
      const targetChunks: string[][] = []
      for (let i = 0; i < teamManagerUids.length; i += 30) {
        targetChunks.push(teamManagerUids.slice(i, i + 30))
      }

      // Récupérer les membres actifs sous contrat pour chaque Team Manager (exclure support_agent et promus)
      const activeMemberIdsByManager: Record<string, Set<string>> = {}
      for (const uid of teamManagerUids) {
        activeMemberIdsByManager[uid] = new Set<string>()
      }

      await Promise.all(
        targetChunks.map(async (c) => {
          const snap = await adminDb.collection('team_accesses').where('managerUid', 'in', c).get()
          snap.docs.forEach((d) => {
            const data = d.data()
            if (data.role === 'support_agent' || data.status === 'promoted') return
            const mUid = data.managerUid
            if (mUid && activeMemberIdsByManager[mUid]) {
              activeMemberIdsByManager[mUid].add(d.id)
              if (data.firebaseUid) activeMemberIdsByManager[mUid].add(data.firebaseUid)
              if (data.activatedUid) activeMemberIdsByManager[mUid].add(data.activatedUid)
              if (data.memberId) activeMemberIdsByManager[mUid].add(data.memberId)
            }
          })
        })
      )

      await Promise.all(
        targetChunks.map(async (c) => {
          const snap = await adminDb.collection('teamTargets').where('managerUid', 'in', c).get()
          snap.docs.forEach((doc) => {
            const d = doc.data()
            // Filtre strict : ne retenir que les objectifs correspondant strictement au mois actif M
            if (!d.period || d.period !== currentMonthPeriod) return

            const mUid = d.managerUid
            // Source de vérité : vérifier que le commercial fait partie des membres actifs sous contrat
            if (!mUid || !d.memberId || !activeMemberIdsByManager[mUid]?.has(d.memberId)) return

            if (!targetsByManager[mUid]) {
              targetsByManager[mUid] = { targetVolume: 0, targetValue: 0 }
            }
            if (typeof d.targetVolume === 'number' && d.targetVolume > 0) {
              targetsByManager[mUid].targetVolume += d.targetVolume
              orgTargetVolume += d.targetVolume
            }
            if (typeof d.targetValue === 'number' && d.targetValue > 0) {
              targetsByManager[mUid].targetValue += d.targetValue
              orgTargetValue += d.targetValue
            }
          })
        })
      )
    } catch (e) {
      console.warn('[reporting/org targets lookup]', e)
    }

    // 6. Top performers (Team Managers uniquement, triés par nombre de conclus)
    const topPerformers = teamManagerUids
      .map((uid) => {
        const mStats = statsByManager[uid] ?? { prospection: 0, negociation: 0, conclue: 0, total: 0, concludedAmount: 0 }
        const mTgt = targetsByManager[uid] ?? { targetVolume: 0, targetValue: 0 }
        const volRate = calculateAttainmentRate(mStats.conclue, mTgt.targetVolume)
        const valRate = calculateAttainmentRate(mStats.concludedAmount, mTgt.targetValue)

        return {
          uid,
          name: managersMap[uid]?.name || managersMap[uid]?.email || 'Team Manager',
          email: managersMap[uid]?.email ?? '',
          orgRole: managersMap[uid]?.orgRole ?? 'team_manager',
          isSenior: false,
          stats: mStats,
          targetVolume: mTgt.targetVolume > 0 ? mTgt.targetVolume : null,
          targetValue: mTgt.targetValue > 0 ? mTgt.targetValue : null,
          volumeAttainmentRate: volRate,
          valueAttainmentRate: valRate
        }
      })
      .sort((a, b) => b.stats.conclue - a.stats.conclue || b.stats.concludedAmount - a.stats.concludedAmount)

    // 7. Taux de conversion global (conclus / total)
    const conversionRate =
      globalCounts.total > 0 ? Math.round((globalCounts.conclue / globalCounts.total) * 100) : 0

    // 8. Taux d'atteinte consolidés
    const orgVolumeAttainment = calculateAttainmentRate(globalCounts.conclue, orgTargetVolume)
    const orgValueAttainment = calculateAttainmentRate(totalConcludedAmount, orgTargetValue)

    // 9. Activité récente (10 derniers prospects conclus)
    const recentActivity = allItems
      .filter((i) => normalizeStatus(i.status ?? '') === 'conclue')
      .sort((a, b) => {
        const tA = a.updatedAt?.toDate?.()?.getTime?.() ?? a.updatedAt ?? 0
        const tB = b.updatedAt?.toDate?.()?.getTime?.() ?? b.updatedAt ?? 0
        return tB - tA
      })
      .slice(0, 10)
      .map((i) => ({
        id: i.id,
        companyName: i.companyName || i.name || 'Prospect',
        managerUid: i.managerUid,
        managerName: managersMap[i.managerUid]?.name ?? i.managerUid,
        memberName: i.memberName || i.assignedTo || null,
        updatedAt: i.updatedAt?.toDate?.()?.toISOString?.() ?? i.updatedAt ?? null
      }))

    const cycleContext = getCurrentCycleContext()
    const [selYear, selMonth] = activeMonthPeriod.split('-').map(Number)
    const selectedPeriodInfo =
      selYear && selMonth ? getMonthPeriodInfo(selYear, selMonth) : cycleContext.currentPeriod

    return NextResponse.json({
      orgCode,
      managers: topPerformers,
      globalCounts,
      conversionRate,
      totalConcludedAmount,
      totalPipelineValue,
      totalLostAmount,
      lossReasonsSummary,
      targets: {
        targetVolume: orgTargetVolume > 0 ? orgTargetVolume : null,
        targetValue: orgTargetValue > 0 ? orgTargetValue : null,
        volumeRealized: globalCounts.conclue,
        valueRealized: totalConcludedAmount,
        volumeAttainmentRate: orgVolumeAttainment,
        valueAttainmentRate: orgValueAttainment
      },
      monthlyCycle: {
        ...cycleContext,
        currentPeriod: selectedPeriodInfo
      },
      recentActivity,
      totalManagers: teamManagerUids.length
    })
  } catch (err: any) {
    console.error('GET /api/reporting/org error:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
