import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { campayCollect } from '@/lib/campay'
import { FieldValue } from 'firebase-admin/firestore'
import { PLANS } from '@/lib/payment-plans'

// Re-export pour compatibilité
export { PLANS }

/**
 * POST /api/payment/initiate
 * Body: { plan: 'pro' | 'starter' | 'enterprise', phone: '237XXXXXXXXX' }
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

    // ── Validation body ────────────────────────────────────────────────────
    const { plan, phone } = (await request.json()) as { plan: string; phone: string }

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }
    if (!phone || !/^237[0-9]{8,9}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Numéro de téléphone invalide. Format attendu : 237XXXXXXXXX' },
        { status: 400 }
      )
    }

    const planInfo = PLANS[plan]

    // ── Référence unique ───────────────────────────────────────────────────
    const external_reference = `SC2-${userId.slice(0, 8)}-${Date.now()}`

    // ── Créer la transaction en base (statut: pending) ─────────────────────
    await adminDb.collection('payments').doc(external_reference).set({
      userId,
      userEmail,
      plan,
      amount: planInfo.amount,
      phone,
      status: 'PENDING',
      campayRef: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    // ── Appel CAMPAY ───────────────────────────────────────────────────────
    const campayResponse = await campayCollect({
      amount: String(planInfo.amount),
      currency: 'XAF',
      from: phone,
      description: `Sales Companion 2.0 — Abonnement ${planInfo.label}`,
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
      amount: planInfo.amount,
      plan
    })
  } catch (error) {
    console.error('[payment/initiate]', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
