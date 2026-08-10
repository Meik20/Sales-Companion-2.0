export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminCached } from '@/lib/api-admin-auth'

/** GET /api/admin/logs — returns the 20 most recent search logs */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdminCached(token)

    const snap = await adminDb.collection('searches').orderBy('createdAt', 'desc').limit(20).get()

    const logs = snap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        query: data.query ?? '',
        userEmail: data.userEmail ?? data.email ?? '',
        userName: data.userName ?? data.name ?? '',
        plan: data.plan ?? 'free',
        resultsCount: data.resultsCount ?? data.results_count ?? 0,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : (data.createdAt ?? null)
      }
    })

    return NextResponse.json(logs)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Admin logs error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
