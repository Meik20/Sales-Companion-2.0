export const dynamic = 'force-dynamic'
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

    const paymentsSnap = await adminDb
      .collection('payments')
      .orderBy('createdAt', 'desc')
      .get()

    const items = paymentsSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        reference: doc.id,
        userId: data.userId ?? null,
        userEmail: data.userEmail ?? null,
        plan: data.plan ?? null,
        operator: data.operator ?? null,
        transactionId: data.transactionId ?? null,
        amount: data.amount ?? null,
        status: data.status ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
        campayRef: data.campayRef ?? null
      }
    })

    return NextResponse.json({ items })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Admin payments GET error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
