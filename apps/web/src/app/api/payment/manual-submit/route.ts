import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * POST /api/payment/manual-submit
 * Enregistre une demande de paiement par transfert manuel.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid
    const userEmail = decoded.email ?? ''

    const body = await request.json()
    const { plan, operator, transactionId, amount } = body

    if (!plan || !transactionId) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const reference = `MANUAL-${userId.slice(0, 5)}-${Date.now()}`

    await adminDb.collection('payments').doc(reference).set({
      userId,
      userEmail,
      plan,
      operator,
      transactionId,
      amount,
      status:    'MANUAL_PENDING', // Statut spécial pour validation admin
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, reference })
  } catch (error) {
    console.error('[payment/manual-submit]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
