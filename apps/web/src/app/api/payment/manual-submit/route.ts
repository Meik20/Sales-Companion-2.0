import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
// PLAN_LIMITS et UserPlan retirés : le plan n'est plus mis à jour ici.
import { createAdminNotification } from '@/lib/admin-notifications'

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
      status: 'MANUAL_PENDING', // Statut spécial pour validation admin
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    // ✅ Ne PAS activer le plan ici — l'admin doit valider d'abord.
    // On marque uniquement paymentPending=true pour que l'AuthGuard
    // puisse afficher l'écran "en attente de validation".
    // Le plan et le dailyLimit seront mis à jour par /api/admin/payments/[reference]
    // uniquement après validation manuelle de l'admin.
    await adminDb.collection('users').doc(userId).update({
      paymentPending: true,
      paymentPendingPlan: plan, // plan souhaité — affiché dans le panel admin
      updatedAt: FieldValue.serverTimestamp()
    })

    // ✅ Notification temps réel pour l'admin
    await createAdminNotification({
      type: 'payment_submitted',
      title: 'Nouveau paiement en attente',
      message: `${userEmail} a soumis une preuve de paiement pour le plan ${plan?.toUpperCase()} (${operator} — ID: ${transactionId})`,
      userId,
      userEmail,
      reference,
      link: '/admin/payments'
    })

    return NextResponse.json({ success: true, reference })
  } catch (error) {
    console.error('[payment/manual-submit]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
