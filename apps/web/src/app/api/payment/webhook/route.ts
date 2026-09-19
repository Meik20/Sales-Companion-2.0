import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { PLANS } from '@/lib/payment-plans'
import { PLAN_LIMITS } from '@sales-companion/shared'
import { syncTeamMemberPlans } from '@/lib/sync-team-plan'

/**
 * POST /api/payment/webhook
 * CAMPAY appelle cette URL après confirmation d'un paiement.
 * À configurer dans le dashboard CAMPAY → Webhook URL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { status, reference, external_reference, amount, operator } = body as {
      status: string
      reference: string
      external_reference: string
      amount: string
      operator: string
    }

    console.log('[webhook/campay] reçu:', { status, reference, external_reference, operator })

    if (!external_reference) {
      return NextResponse.json({ error: 'external_reference manquant' }, { status: 400 })
    }

    // Récupérer la transaction en base
    const paymentRef = adminDb.collection('payments').doc(external_reference)
    const paymentDoc = await paymentRef.get()

    if (!paymentDoc.exists) {
      console.warn('[webhook/campay] transaction introuvable:', external_reference)
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
    }

    const paymentData = paymentDoc.data()!

    // ── Si paiement réussi → upgrade du plan ──────────────────────────────
    if (status === 'SUCCESSFUL') {
      const planInfo = PLANS[paymentData.plan]

      await adminDb
        .collection('users')
        .doc(paymentData.userId)
        .update({
          plan: paymentData.plan,
          dailyLimit: planInfo?.dailyLimit ?? PLAN_LIMITS.enterprise,
          updatedAt: FieldValue.serverTimestamp()
        })

      await paymentRef.update({
        status: 'SUCCESSFUL',
        campayRef: reference,
        operator: operator ?? paymentData.operator,
        amountPaid: amount,
        updatedAt: FieldValue.serverTimestamp()
      })

      console.log(
        `[webhook/campay] ✅ plan "${paymentData.plan}" activé pour user ${paymentData.userId}`
      )

      // ── Propagation automatique du plan aux membres de l'équipe ──────────
      // Les support_agents sont intentionnellement exclus (accès illimité par design)
      try {
        const syncResult = await syncTeamMemberPlans(paymentData.userId, paymentData.plan)
        console.log(
          `[webhook/campay] 👥 sync équipe: ${syncResult.updatedUsers} membres mis à jour`
        )
      } catch (syncErr) {
        // Non-bloquant : le paiement est validé même si la sync échoue
        console.error('[webhook/campay] sync team plan failed (non-blocking):', syncErr)
      }
    } else if (status === 'FAILED') {
      await paymentRef.update({
        status: 'FAILED',
        updatedAt: FieldValue.serverTimestamp()
      })
      console.log('[webhook/campay] ❌ paiement échoué:', external_reference)
    }

    // CAMPAY attend un 200 pour considérer le webhook comme reçu
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[webhook/campay] erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
