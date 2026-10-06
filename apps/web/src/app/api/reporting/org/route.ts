import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

function normalizeStatus(status: string): 'prospection' | 'negociation' | 'conclue' | 'other' {
  const s = (status || '').toLowerCase().trim()
  if (['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead'].includes(s)) return 'prospection'
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
    if (!callerDoc.exists || !callerData) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    if (callerData.role !== 'manager') {
      return NextResponse.json({ error: 'Accès réservé aux managers' }, { status: 403 })
    }
    if (callerData.orgRole !== 'senior_manager') {
      return NextResponse.json({ error: 'Accès réservé au Senior Manager' }, { status: 403 })
    }

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

    const managerUids = managersSnap.docs.map((d) => d.id)
    const managersMap: Record<string, { name: string; email: string; orgRole: string; isSenior: boolean }> = {}
    managersSnap.docs.forEach((d) => {
      const m = d.data()
      managersMap[d.id] = {
        name: m.displayName || m.name || m.email || d.id,
        email: m.email || '',
        orgRole: m.orgRole || 'team_manager',
        isSenior: m.orgRole === 'senior_manager'
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
        const snap = await adminDb
          .collection('pipeline')
          .where('managerUid', 'in', chunk)
          .get()
        snap.docs.forEach((d) => allItems.push({ id: d.id, ...d.data() }))
      })
    )

    // 3. Comptes globaux
    const globalCounts = { prospection: 0, negociation: 0, conclue: 0, total: allItems.length }
    for (const item of allItems) {
      const ns = normalizeStatus(item.status ?? '')
      if (ns !== 'other') globalCounts[ns]++
    }

    // 4. Stats par manager
    const statsByManager: Record<string, { prospection: number; negociation: number; conclue: number; total: number }> = {}
    for (const uid of managerUids) {
      statsByManager[uid] = { prospection: 0, negociation: 0, conclue: 0, total: 0 }
    }
    for (const item of allItems) {
      const uid = item.managerUid
      if (uid && statsByManager[uid]) {
        statsByManager[uid].total++
        const ns = normalizeStatus(item.status ?? '')
        if (ns !== 'other') statsByManager[uid][ns]++
      }
    }

    // 5. Top performers (Team Managers uniquement, triés par nombre de conclus)
    const teamManagerUids = managerUids.filter((uid) => !managersMap[uid]?.isSenior)
    const topPerformers = teamManagerUids
      .map((uid) => ({
        uid,
        name: managersMap[uid]?.name ?? uid,
        email: managersMap[uid]?.email ?? '',
        orgRole: managersMap[uid]?.orgRole ?? 'team_manager',
        isSenior: false,
        stats: statsByManager[uid] ?? { prospection: 0, negociation: 0, conclue: 0, total: 0 }
      }))
      .sort((a, b) => b.stats.conclue - a.stats.conclue)

    // 6. Taux de conversion global (conclus / total)
    const conversionRate =
      globalCounts.total > 0 ? Math.round((globalCounts.conclue / globalCounts.total) * 100) : 0

    // 7. Activité récente (10 derniers prospects conclus)
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
      recentActivity,
      totalManagers: teamManagerUids.length
    })
  } catch (err: any) {
    console.error('GET /api/reporting/org error:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
