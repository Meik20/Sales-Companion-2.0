import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

async function verifyAdmin(token: string | null) {
  if (!token) throw new Error('unauthenticated')
  const decoded = await adminAuth.verifyIdToken(token)
  const doc = await adminDb.collection('users').doc(decoded.uid).get()
  if (doc.data()?.role !== 'admin') throw new Error('forbidden')
  return decoded
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdmin(token)

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '50', 10)

    const totalSnap = await adminDb.collection('users').count().get()
    const total = totalSnap.data().count

    const usersSnap = await adminDb
      .collection('users')
      .orderBy('createdAt', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .get()

    const items = usersSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        uid: doc.id,
        name: data.name ?? null,
        email: data.email ?? null,
        role: data.role ?? 'member',
        plan: data.plan ?? 'free',
        active: data.active ?? true,
        dailyUsed: data.dailyUsed ?? 0,
        dailyLimit: data.dailyLimit ?? 10,
        company: data.company ?? null,
        sector: data.sector ?? null,
        region: data.region ?? null,
        phone: data.phone ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() ?? null,
        managerId: data.managerId ?? null,
      }
    })

    return NextResponse.json({ items, total, page, pageSize })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
