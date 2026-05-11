import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { campayGetTransaction } from '@/lib/campay'
import { FieldValue } from 'firebase-admin/firestore'
import { PLANS } from '@/lib/payment-plans'

/**
 * GET /api/payment/status/[ref]
 * Vérifie le statut d'un paiement CAMPAY et met à jour le plan si succès.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref: externalRef } = await params

    // Récupérer la transaction en base
    const paymentDoc = await adminDb.collection('payments').doc(externalRef).get()
    if (!paymentDoc.exists) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
    }

    const paymentData = paymentDoc.data()!

    // Si déjà traité, retourner directement
    if (paymentData.status === 'SUCCESSFUL') {
      return NextResponse.json({ status: 'SUCCESSFUL', plan: paymentData.plan })
    }
    if (paymentData.status === 'FAILED') {
      return NextResponse.json({ status: 'FAILED' })
    }

    // Interroger CAMPAY pour le statut actuel
    const campayStatus = await campayGetTransaction(paymentData.campayRef)

    if (campayStatus.status === 'SUCCESSFUL') {
      const planInfo = PLANS[paymentData.plan]

      // ── Upgrade du plan utilisateur ──────────────────────────────────────
      await adminDb.collection('users').doc(paymentData.userId).update({
        plan:       paymentData.plan,
        dailyLimit: planInfo?.dailyLimit ?? 1000,
        updatedAt:  FieldValue.serverTimestamp(),
      })

      // ── Marquer la transaction comme réussie ──────────────────────────────
      await adminDb.collection('payments').doc(externalRef).update({
        status:    'SUCCESSFUL',
        updatedAt: FieldValue.serverTimestamp(),
      })

      return NextResponse.json({ status: 'SUCCESSFUL', plan: paymentData.plan })
    }

    if (campayStatus.status === 'FAILED') {
      await adminDb.collection('payments').doc(externalRef).update({
        status:    'FAILED',
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ status: 'FAILED' })
    }

    // Toujours en attente
    return NextResponse.json({ status: 'PENDING' })
  } catch (error) {
    console.error('[payment/status]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
