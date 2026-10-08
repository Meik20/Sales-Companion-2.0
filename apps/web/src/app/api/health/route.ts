import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  let firestoreStatus = 'unknown'

  try {
    const { adminDb } = await import('@/lib/firebase-admin')
    // Probe Firestore connectivity with a lightweight limit(1) query
    await adminDb.collection('app_config').limit(1).get()
    firestoreStatus = 'connected'
  } catch (err: unknown) {
    console.error('[health] Firestore probe failed:', err)
    firestoreStatus = 'error'
  }

  const duration = Date.now() - start
  const isHealthy = firestoreStatus === 'connected'

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        firestore: firestoreStatus,
        latencyMs: duration
      },
      env: process.env.NODE_ENV || 'development'
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    }
  )
}

