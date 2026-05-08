export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

async function verifyAdmin(token: string | null) {
  if (!token) throw new Error('unauthenticated')
  const decoded = await adminAuth.verifyIdToken(token)
  const d = await adminDb.collection('users').doc(decoded.uid).get()
  if (d.data()?.role !== 'admin') throw new Error('forbidden')
  return decoded
}

/** POST /api/admin/config — store a config key/value in Firestore */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdmin(token)

    const { key, value } = await request.json()
    if (!key || !value) {
      return NextResponse.json({ error: 'key et value requis' }, { status: 400 })
    }

    await adminDb.collection('config').doc('admin').set(
      { [key]: value, updatedAt: new Date() },
      { merge: true }
    )

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Admin config error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

/** GET /api/admin/config — read config */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdmin(token)

    const snap = await adminDb.collection('config').doc('admin').get()
    const data = snap.data() ?? {}

    // Never return the raw key value — just indicate if it is set
    return NextResponse.json({
      groq_api_key: !!data.groq_api_key,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Admin config GET error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

