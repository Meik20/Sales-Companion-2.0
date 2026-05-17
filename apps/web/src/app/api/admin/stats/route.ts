export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

export async function GET(request: NextRequest) {
  try {
    // Verify the caller is an authenticated admin
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(token)
    const callerDoc = await adminDb.collection('users').doc(decoded.uid).get()
    const callerRole = callerDoc.data()?.role
    if (callerRole !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Run all count queries in parallel
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      usersSnap,
      companiesSnap,
      pipelineSnap,
      activeUsersSnap,
      newUsersSnap,
      searchesTodaySnap,
      usersDataSnap
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
      adminDb.collection('users').select('role', 'plan').get()
    ])

    const roles: Record<string, number> = {}
    const plans: Record<string, number> = {}

    const allUsersSnap = usersDataSnap as FirebaseFirestore.QuerySnapshot
    allUsersSnap.forEach((doc) => {
      const data = doc.data()
      const role = data.role || 'member'
      const plan = (data.plan || 'free').toUpperCase()
      roles[role] = (roles[role] || 0) + 1
      plans[plan] = (plans[plan] || 0) + 1
    })

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
