export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { verifyAdminCached } from '@/lib/api-admin-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify the caller is an authenticated admin
    const token = request.headers.get('authorization')?.split(' ')[1]
    try {
      await verifyAdminCached(token)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'unauthenticated') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // ── Agrégations de comptage (count) ────────────────────────────────────
    // count() Firestore ne facture qu'une seule lecture quelle que soit la
    // taille de la collection — c'est incomparablement moins coûteux qu'un .get()
    const [
      usersSnap,
      companiesSnap,
      pipelineSnap,
      activeUsersSnap,
      newUsersSnap,
      searchesTodaySnap,
      // Répartition par rôle — count() par valeur de rôle (6 requêtes au lieu de N lectures)
      memberCount,
      managerCount,
      independentCount,
      adminCount,
      supportAgentCount,
      // Répartition par plan — count() par valeur de plan
      freePlanCount,
      starterPlanCount,
      proPlanCount,
      enterprisePlanCount
    ] = await Promise.all([
      adminDb.collection('users').count().get(),
      adminDb.collection('companies').count().get(),
      adminDb.collection('pipeline').count().get(),
      adminDb
        .collection('users')
        .where('lastLoginAt', '>=', Timestamp.fromDate(oneWeekAgo))
        .count()
        .get(),
      adminDb
        .collection('users')
        .where('createdAt', '>=', Timestamp.fromDate(oneWeekAgo))
        .count()
        .get(),
      adminDb
        .collection('searches')
        .where('createdAt', '>=', Timestamp.fromDate(todayStart))
        .count()
        .get(),
      // Role distribution via count() — 1 opération d'index par requête
      adminDb.collection('users').where('role', '==', 'member').count().get(),
      adminDb.collection('users').where('role', '==', 'manager').count().get(),
      adminDb.collection('users').where('role', '==', 'independent').count().get(),
      adminDb.collection('users').where('role', '==', 'admin').count().get(),
      adminDb.collection('users').where('role', '==', 'support_agent').count().get(),
      // Plan distribution via count()
      adminDb.collection('users').where('plan', '==', 'free').count().get(),
      adminDb.collection('users').where('plan', '==', 'starter').count().get(),
      adminDb.collection('users').where('plan', '==', 'pro').count().get(),
      adminDb.collection('users').where('plan', '==', 'enterprise').count().get()
    ])

    const roles: Record<string, number> = {
      member: memberCount.data().count,
      manager: managerCount.data().count,
      independent: independentCount.data().count,
      admin: adminCount.data().count,
      support_agent: supportAgentCount.data().count
    }

    const plans: Record<string, number> = {
      FREE: freePlanCount.data().count,
      STARTER: starterPlanCount.data().count,
      PRO: proPlanCount.data().count,
      ENTERPRISE: enterprisePlanCount.data().count
    }

    return NextResponse.json({
      totalUsers: usersSnap.data().count,
      totalCompanies: companiesSnap.data().count,
      totalPipelineItems: pipelineSnap.data().count,
      activeUsers: activeUsersSnap.data().count,
      newUsersThisWeek: newUsersSnap.data().count,
      totalSearchesToday: searchesTodaySnap.data().count,
      roleDistribution: roles,
      planDistribution: plans
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
