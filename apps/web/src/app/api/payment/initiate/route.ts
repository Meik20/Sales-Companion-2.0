import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { campayCollect } from '@/lib/campay'
import { FieldValue } from 'firebase-admin/firestore'
import { PAID_PLANS, lookupPlan, resolvePlanAmount } from '@/lib/payment-plans'
import { assertCanManageBilling } from '@/lib/org-billing-guard'
import type { UserPlan } from '@sales-companion/shared'

/**
 * POST /api/payment/initiate
 * Body: { plan: 'pro' | 'starter' | 'enterprise', phone: '237XXXXXXXXX' }
 *
 * Sécurité (CWE-807 / Sonar S5867 — Price Tampering) :
 * Le montant facturé est EXCLUSIVEMENT résolu depuis la table serveur PLANS
 * via resolvePlanAmount(). La valeur fournie par le client ne touche jamais
 * le montant de la transaction — seul l'identifiant de plan est accepté.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Authentification ───────────────────────────────────────────────────
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    let userId: string
    let userEmail: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userId = decoded.uid
      userEmail = decoded.email ?? ''
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const billingCheck = await assertCanManageBilling(userId)
    if (!billingCheck.allowed) {
      return NextResponse.json({ error: billingCheck.reason }, { status: 403 })
    }

    // ── Validation body ────────────────────────────────────────────────────
    const body = (await request.json()) as { plan?: unknown; phone?: unknown }

    // Validation stricte du plan : doit être un string parmi les plans payants connus
    const planInput = typeof body.plan === 'string' ? body.plan.trim().toLowerCase() : ''
    if (!planInput || !PAID_PLANS.includes(planInput as UserPlan)) {
      return NextResponse.json(
        { error: `Plan invalide. Plans disponibles : ${PAID_PLANS.join(', ')}` },
        { status: 400 }
      )
    }
    // Cast sécurisé après validation de la liste blanche
    const plan = planInput as UserPlan

    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    if (!phone || !/^237[0-9]{8,9}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Numéro de téléphone invalide. Format attendu : 237XXXXXXXXX' },
        { status: 400 }
      )
    }

    const planInfo = lookupPlan(plan)!

    // ── Résolution serveur exclusive du montant (anti-price tampering) ──────
    // Le montant est résolu UNIQUEMENT depuis la constante serveur PLANS.
    // Aucune valeur provenant du client ne peut influencer ce montant.
    const serverAmount = resolvePlanAmount(plan)
    if (!serverAmount || serverAmount !== planInfo.amount) {
      return NextResponse.json({ error: 'Plan non facturable' }, { status: 400 })
    }

    // ── Référence unique ───────────────────────────────────────────────────
    const external_reference = `SC2-${userId.slice(0, 8)}-${Date.now()}`

    // ── Créer la transaction en base (statut: pending) ─────────────────────
    await adminDb.collection('payments').doc(external_reference).set({
      userId,
      userEmail,
      plan,
      amount: serverAmount,
      phone,
      status: 'PENDING',
      campayRef: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    // ── Appel CAMPAY ───────────────────────────────────────────────────────
    const campayResponse = await campayCollect({
      amount: String(serverAmount),
      currency: 'XAF',
      from: phone,
      description: `Sales Companion 2.0 – Abonnement ${planInfo.label}`,
      external_reference
    })

    // ── Mettre à jour avec la référence CAMPAY ─────────────────────────────
    await adminDb.collection('payments').doc(external_reference).update({
      campayRef: campayResponse.reference,
      operator: campayResponse.operator,
      updatedAt: FieldValue.serverTimestamp()
    })

    return NextResponse.json({
      success: true,
      external_reference,
      campay_reference: campayResponse.reference,
      operator: campayResponse.operator,
      ussd_code: campayResponse.ussd_code,
      amount: serverAmount,
      plan
    })
  } catch (error) {
    console.error('[payment/initiate]', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
