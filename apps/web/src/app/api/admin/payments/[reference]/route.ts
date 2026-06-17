export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { PLANS } from '@/lib/payment-plans'

async function verifyAdmin(token: string | null) {
  if (!token) throw new Error('unauthenticated')
  const decoded = await adminAuth.verifyIdToken(token)
  const doc = await adminDb.collection('users').doc(decoded.uid).get()
  if (doc.data()?.role !== 'admin') throw new Error('forbidden')
  return decoded
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdmin(token)

    const { reference } = await params
    const body = await request.json()
    const { action } = body as { action: 'validate' | 'reject' }

    if (action !== 'validate' && action !== 'reject') {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const paymentRef = adminDb.collection('payments').doc(reference)
    const paymentDoc = await paymentRef.get()

    if (!paymentDoc.exists) {
      return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
    }

    const paymentData = paymentDoc.data()!

    if (paymentData.status !== 'MANUAL_PENDING') {
      return NextResponse.json({ error: 'Paiement déjà traité' }, { status: 400 })
    }

    if (action === 'validate') {
      const planInfo = PLANS[paymentData.plan]

      // Update user plan and limits
      await adminDb
        .collection('users')
        .doc(paymentData.userId)
        .update({
          plan: paymentData.plan,
          dailyLimit: planInfo?.dailyLimit ?? 10,
          active: true,
          updatedAt: FieldValue.serverTimestamp()
        })

      // Update payment status
      await paymentRef.update({
        status: 'SUCCESSFUL',
        updatedAt: FieldValue.serverTimestamp()
      })
    } else {
      // Action is reject
      await paymentRef.update({
        status: 'FAILED',
        updatedAt: FieldValue.serverTimestamp()
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Admin payment PATCH error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
