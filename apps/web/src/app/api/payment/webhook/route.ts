import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { PLANS } from '@/lib/payment-plans'
import { PLAN_LIMITS } from '@sales-companion/shared'
import { syncTeamMemberPlans } from '@/lib/sync-team-plan'

/**
 * Vérifie la signature HMAC-SHA256 du webhook CamPay.
 *
 * CamPay envoie l'en-tête `X-Campay-Signature` (ou `X-Webhook-Signature`)
 * contenant HMAC-SHA256(rawBody, CAMPAY_WEBHOOK_SECRET).
 *
 * Si la variable CAMPAY_WEBHOOK_SECRET n'est pas configurée, on laisse
 * passer en développement (NODE_ENV !== 'production') avec un warning.
 * En production, l'absence du secret bloque toute requête.
 */
async function verifyWebhookSignature(
  request: NextRequest,
  rawBody: string
): Promise<{ valid: boolean; reason?: string }> {
  const secret = process.env.CAMPAY_WEBHOOK_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { valid: false, reason: 'CAMPAY_WEBHOOK_SECRET non configuré en production' }
    }
    console.warn('[webhook/campay] ⚠️  CAMPAY_WEBHOOK_SECRET absent — vérification ignorée (dev uniquement)')
    return { valid: true }
  }

  // CamPay peut utiliser différents noms d'en-tête selon la version
  const signature =
    request.headers.get('x-campay-signature') ||
    request.headers.get('x-webhook-signature') ||
    request.headers.get('x-hub-signature-256')?.replace('sha256=', '')

  if (!signature) {
    return { valid: false, reason: "En-tête de signature manquant (x-campay-signature)" }
  }

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  try {
    const sigBuf = Buffer.from(signature, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) {
      return { valid: false, reason: 'Longueur de signature invalide' }
    }
    const match = timingSafeEqual(sigBuf, expBuf)
    return match ? { valid: true } : { valid: false, reason: 'Signature HMAC invalide' }
  } catch {
    return { valid: false, reason: 'Erreur lors de la comparaison de signature' }
  }
}

/**
 * POST /api/payment/webhook
 *
 * CamPay appelle cette URL après confirmation d'un paiement Mobile Money.
 * Configurer dans le dashboard CamPay → Webhook URL.
 *
 * SÉCURITÉ :
 * - Vérification HMAC-SHA256 (CAMPAY_WEBHOOK_SECRET)
 * - Idempotence : un paiement déjà SUCCESSFUL n'est pas re-traité
 * - Log d'audit dans Firestore (webhook_logs/)
 */
export async function POST(request: NextRequest) {
  // ── Lire le body brut pour la vérification de signature ─────────────────
  const rawBody = await request.text()
  let body: Record<string, string>

  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  // ── Vérification HMAC ────────────────────────────────────────────────────
  const sigCheck = await verifyWebhookSignature(request, rawBody)
  if (!sigCheck.valid) {
    console.error('[webhook/campay] 🚨 Signature invalide:', sigCheck.reason, {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      ref: body.external_reference
    })
    // Rejeter avec 401 si la signature HMAC est invalide
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  }

  const { status, reference, external_reference, amount, operator } = body as {
    status: string
    reference: string
    external_reference: string
    amount: string
    operator: string
  }

  console.log('[webhook/campay] ✉️  reçu:', { status, reference, external_reference, operator })

  if (!external_reference) {
    return NextResponse.json({ error: 'external_reference manquant' }, { status: 400 })
  }

  // ── Récupérer la transaction en base ─────────────────────────────────────
  const paymentRef = adminDb.collection('payments').doc(external_reference)
  const paymentDoc = await paymentRef.get()

  // Log d'audit (non-bloquant) — toujours enregistré, même si la transaction est inconnue
  adminDb.collection('webhook_logs').add({
    source: 'campay',
    external_reference,
    campayRef: reference || null,
    status,
    operator: operator || null,
    amount: amount || null,
    receivedAt: FieldValue.serverTimestamp(),
    signatureValid: true
  }).catch((e) => console.warn('[webhook/campay] audit log failed:', e))

  const paymentData = paymentDoc.data()
  if (!paymentDoc.exists || !paymentData) {
    console.warn('[webhook/campay] transaction introuvable:', external_reference)
    return NextResponse.json({ received: true }) // 200 pour éviter les retries infinis
  }

  try {
    if (status === 'SUCCESSFUL') {
      // ── IDEMPOTENCE : ne pas re-traiter si déjà activé ──────────────────
      if (paymentData.status === 'SUCCESSFUL') {
        console.log('[webhook/campay] ♻️  doublon ignoré (déjà SUCCESSFUL):', external_reference)
        return NextResponse.json({ received: true })
      }

      const planInfo = PLANS[paymentData.plan]
      if (!planInfo) {
        console.error('[webhook/campay] plan inconnu:', paymentData.plan)
        return NextResponse.json({ received: true })
      }

      const { calculateSubscriptionExpiry } = await import('@/lib/subscription')
      const expiresAt = calculateSubscriptionExpiry()

      // Batch atomique : user + payment en une seule écriture
      const batch = adminDb.batch()

      batch.update(adminDb.collection('users').doc(paymentData.userId), {
        plan: paymentData.plan,
        dailyLimit: planInfo.dailyLimit ?? PLAN_LIMITS.enterprise,
        active: true,
        activated: true,
        subscriptionStartedAt: FieldValue.serverTimestamp(),
        subscriptionExpiresAt: expiresAt.toISOString(),
        subscriptionExpired: false,
        updatedAt: FieldValue.serverTimestamp()
      })

      batch.update(paymentRef, {
        status: 'SUCCESSFUL',
        campayRef: reference,
        operator: operator ?? paymentData.operator,
        amountPaid: amount,
        activatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })

      await batch.commit()

      console.log(
        `[webhook/campay] ✅ plan "${paymentData.plan}" activé pour user ${paymentData.userId}`
      )

      // ── Propagation automatique aux membres de l'équipe (non-bloquant) ──
      syncTeamMemberPlans(paymentData.userId, paymentData.plan, {
        subscriptionExpiresAt: expiresAt.toISOString(),
        subscriptionStartedAt: new Date().toISOString(),
        subscriptionExpired: false
      })
        .then((r) =>
          console.log(`[webhook/campay] 👥 sync équipe: ${r.updatedUsers} utilisateurs mis à jour`)
        )
        .catch((e) => console.error('[webhook/campay] sync team plan failed (non-blocking):', e))
    } else if (status === 'FAILED') {
      if (paymentData.status !== 'FAILED') {
        await paymentRef.update({
          status: 'FAILED',
          updatedAt: FieldValue.serverTimestamp()
        })
        console.log('[webhook/campay] ❌ paiement échoué:', external_reference)
      }
    } else if (status === 'PENDING') {
      // CamPay envoie parfois un PENDING avant SUCCESSFUL — on l'ignore
      console.log('[webhook/campay] ⏳ PENDING reçu, attente de confirmation:', external_reference)
    } else {
      console.warn('[webhook/campay] statut inconnu:', status, external_reference)
    }
  } catch (error) {
    console.error('[webhook/campay] erreur lors du traitement:', error)
    // Retourner 500 pour que CamPay re-tente (si le paiement n'a pas été activé)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  // CamPay attend un 200 pour considérer le webhook comme reçu
  return NextResponse.json({ received: true })
}

