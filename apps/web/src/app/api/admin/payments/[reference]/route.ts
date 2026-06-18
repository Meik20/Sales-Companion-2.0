export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { PLANS } from '@/lib/payment-plans'
import { sendEmail } from '@/utils/email'

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

      // ✅ Activer le compte et appliquer le plan uniquement après validation admin
      await adminDb
        .collection('users')
        .doc(paymentData.userId)
        .update({
          plan: paymentData.plan,
          dailyLimit: planInfo?.dailyLimit ?? 10,
          active: true,
          activated: true,
          paymentPending: false,      // ← libère l'écran d'attente côté client
          paymentPendingPlan: FieldValue.delete(), // nettoyage
          updatedAt: FieldValue.serverTimestamp()
        })

      // Update payment status
      await paymentRef.update({
        status: 'SUCCESSFUL',
        updatedAt: FieldValue.serverTimestamp()
      })

      // ✅ Fix 6 — Email de confirmation d'activation
      const planLabel = paymentData.plan?.toUpperCase() ?? 'PREMIUM'
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.salescompanion2-0.com'
      try {
        await sendEmail({
          to: paymentData.userEmail,
          subject: `✅ Votre compte Manager ${planLabel} est activé — Sales Companion 2.0`,
          html: `
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1f36;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
              <div style="text-align:center;margin-bottom:32px;">
                <div style="background-color:#1b7a3e;color:white;font-weight:bold;font-size:24px;padding:12px 24px;display:inline-block;border-radius:8px;">SC</div>
              </div>
              <h2 style="color:#111827;font-size:20px;font-weight:700;text-align:center;margin-bottom:24px;">🎉 Votre compte est activé !</h2>
              <p style="font-size:15px;line-height:1.6;color:#4b5563;margin-bottom:16px;">Bonjour,</p>
              <p style="font-size:15px;line-height:1.6;color:#4b5563;margin-bottom:24px;">
                Votre paiement a été vérifié et validé par notre équipe. Votre compte <strong>Manager ${planLabel}</strong> est maintenant actif.
              </p>
              <div style="text-align:center;margin-bottom:32px;">
                <a href="${appUrl}/search" style="background-color:#2ea05a;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">Accéder à mon tableau de bord</a>
              </div>
              <div style="border-top:1px solid #e5e7eb;padding-top:24px;">
                <p style="font-size:14px;color:#6b7280;margin:0;">À très vite,<br/><strong>L'équipe Sales Companion</strong></p>
              </div>
            </div>
          `
        })
      } catch (emailErr) {
        console.error('[admin/payments] Activation email failed (non-blocking):', emailErr)
      }

    } else {
      // Action is reject — reset paymentPending so user can resubmit
      await adminDb
        .collection('users')
        .doc(paymentData.userId)
        .update({
          paymentPending: false,
          paymentPendingPlan: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp()
        })

      await paymentRef.update({
        status: 'FAILED',
        updatedAt: FieldValue.serverTimestamp()
      })

      // ✅ Email d'information en cas de rejet (non-bloquant)
      const appUrlReject = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.salescompanion2-0.com'
      try {
        await sendEmail({
          to: paymentData.userEmail,
          subject: `⚠️ Paiement non confirmé — Sales Companion 2.0`,
          html: `
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1f36;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
              <div style="text-align:center;margin-bottom:32px;">
                <div style="background-color:#1b7a3e;color:white;font-weight:bold;font-size:24px;padding:12px 24px;display:inline-block;border-radius:8px;">SC</div>
              </div>
              <h2 style="color:#111827;font-size:20px;font-weight:700;text-align:center;margin-bottom:24px;">Votre paiement n'a pas pu être confirmé</h2>
              <p style="font-size:15px;line-height:1.6;color:#4b5563;margin-bottom:16px;">Bonjour,</p>
              <p style="font-size:15px;line-height:1.6;color:#4b5563;margin-bottom:24px;">
                Nous n'avons pas pu confirmer votre paiement. Cela peut arriver si l'ID de transaction fourni est incorrect ou si le virement n'a pas encore été reçu.
              </p>
              <div style="text-align:center;margin-bottom:32px;">
                <a href="${appUrlReject}/upgrade?from=register" style="background-color:#f59e0b;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">Soumettre un nouveau paiement</a>
              </div>
              <div style="border-top:1px solid #e5e7eb;padding-top:24px;">
                <p style="font-size:14px;color:#6b7280;margin:0;">Pour toute question, contactez-nous.<br/><strong>L'équipe Sales Companion</strong></p>
              </div>
            </div>
          `
        })
      } catch (emailErr) {
        console.error('[admin/payments] Rejection email failed (non-blocking):', emailErr)
      }
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
