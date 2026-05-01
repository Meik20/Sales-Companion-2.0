import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

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
    ] = await Promise.all([
      adminDb.collection('users').count().get(),
      adminDb.collection('companies').count().get(),
      adminDb.collection('pipeline').count().get(),
      adminDb
        .collection('users')
        .where('lastLoginAt', '>=', oneWeekAgo)
        .count()
        .get(),
      adminDb
        .collection('users')
        .where('createdAt', '>=', oneWeekAgo)
        .count()
        .get(),
      adminDb
        .collection('searches')
        .where('createdAt', '>=', todayStart)
        .count()
        .get(),
    ])

    return NextResponse.json({
      totalUsers: usersSnap.data().count,
      totalCompanies: companiesSnap.data().count,
      totalPipelineItems: pipelineSnap.data().count,
      activeUsers: activeUsersSnap.data().count,
      newUsersThisWeek: newUsersSnap.data().count,
      totalSearchesToday: searchesTodaySnap.data().count,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
