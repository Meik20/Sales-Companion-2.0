import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'
import { getCurrentCycleContext, runMonthlyPipelineCycleAutoArchive } from '@/lib/monthly-cycle'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

function normalizeStatus(status: string): 'prospection' | 'negociation' | 'conclue' | 'other' {
  const s = (status || '').toLowerCase().trim()
  if (['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead'].includes(s))
    return 'prospection'
  if (['negociation', 'negotiation', 'in_progress', 'en_cours'].includes(s)) return 'negociation'
  if (['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(s)) return 'conclue'
  return 'prospection'
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

    // ── Clôture et mise à jour automatique à J+3 après la fin du mois M-1 ──
    await runMonthlyPipelineCycleAutoArchive(adminDb)

    const orgCode = callerData.orgCode
    if (!orgCode) {
      return NextResponse.json({ error: 'Aucun code organisation trouvé' }, { status: 404 })
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
    const globalCounts = { prospection: 0, negociation: 0, conclue: 0, total: allItems.length }
    let totalConcludedAmount = 0
    let totalPipelineValue = 0

    for (const item of allItems) {
      const ns = normalizeStatus(item.status ?? '')
      if (ns !== 'other') globalCounts[ns]++
      const amt = typeof item.amount === 'number' ? item.amount : Number(item.amount) || 0
      if (ns === 'conclue') {
        totalConcludedAmount += amt
      } else if (ns === 'prospection' || ns === 'negociation') {
        totalPipelineValue += amt
      }
    }

    // 4. Stats et CA par manager
    const statsByManager: Record<
      string,
      { prospection: number; negociation: number; conclue: number; total: number; concludedAmount: number }
    > = {}
    for (const uid of managerUids) {
      statsByManager[uid] = { prospection: 0, negociation: 0, conclue: 0, total: 0, concludedAmount: 0 }
    }
    for (const item of allItems) {
      const uid = item.managerUid
      if (uid && statsByManager[uid]) {
        statsByManager[uid].total++
        const ns = normalizeStatus(item.status ?? '')
        if (ns !== 'other') statsByManager[uid][ns]++
        if (ns === 'conclue') {
          const amt = typeof item.amount === 'number' ? item.amount : Number(item.amount) || 0
          statsByManager[uid].concludedAmount += amt
        }
      }
    }

    // 5. Récupérer les objectifs (teamTargets) pour tous les managers du segment
    const targetsByManager: Record<string, { targetVolume: number; targetValue: number }> = {}
    let orgTargetVolume = 0
    let orgTargetValue = 0

    try {
      const targetChunks: string[][] = []
      for (let i = 0; i < managerUids.length; i += 30) {
        targetChunks.push(managerUids.slice(i, i + 30))
      }

      await Promise.all(
        targetChunks.map(async (c) => {
          const snap = await adminDb.collection('teamTargets').where('managerUid', 'in', c).get()
          snap.docs.forEach((doc) => {
            const d = doc.data()
            const mUid = d.managerUid
            if (mUid) {
              if (!targetsByManager[mUid]) {
                targetsByManager[mUid] = { targetVolume: 0, targetValue: 0 }
              }
              if (typeof d.targetVolume === 'number') {
                targetsByManager[mUid].targetVolume += d.targetVolume
                orgTargetVolume += d.targetVolume
              }
              if (typeof d.targetValue === 'number') {
                targetsByManager[mUid].targetValue += d.targetValue
                orgTargetValue += d.targetValue
              }
            }
          })
        })
      )
    } catch (e) {
      console.warn('[reporting/org targets lookup]', e)
    }

    // 6. Top performers (Team Managers uniquement, triés par nombre de conclus)
    const teamManagerUids = managerUids.filter((uid) => !managersMap[uid]?.isSenior)
    const topPerformers = teamManagerUids
      .map((uid) => {
        const mStats = statsByManager[uid] ?? { prospection: 0, negociation: 0, conclue: 0, total: 0, concludedAmount: 0 }
        const mTgt = targetsByManager[uid] ?? { targetVolume: 0, targetValue: 0 }
        const volRate = mTgt.targetVolume > 0 ? Math.round((mStats.conclue / mTgt.targetVolume) * 100) : null
        const valRate = mTgt.targetValue > 0 ? Math.round((mStats.concludedAmount / mTgt.targetValue) * 100) : null

        return {
          uid,
          name: managersMap[uid]?.name ?? uid,
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
    const orgVolumeAttainment =
      orgTargetVolume > 0 ? Math.round((globalCounts.conclue / orgTargetVolume) * 100) : null
    const orgValueAttainment =
      orgTargetValue > 0 ? Math.round((totalConcludedAmount / orgTargetValue) * 100) : null

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

    return NextResponse.json({
      orgCode,
      managers: topPerformers,
      globalCounts,
      conversionRate,
      totalConcludedAmount,
      totalPipelineValue,
      targets: {
        targetVolume: orgTargetVolume > 0 ? orgTargetVolume : null,
        targetValue: orgTargetValue > 0 ? orgTargetValue : null,
        volumeRealized: globalCounts.conclue,
        valueRealized: totalConcludedAmount,
        volumeAttainmentRate: orgVolumeAttainment,
        valueAttainmentRate: orgValueAttainment
      },
      monthlyCycle: getCurrentCycleContext(),
      recentActivity,
      totalManagers: teamManagerUids.length
    })
  } catch (err: any) {
    console.error('GET /api/reporting/org error:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
