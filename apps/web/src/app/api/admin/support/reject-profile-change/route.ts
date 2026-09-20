import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { sendEmail } from '@/utils/email'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/support/reject-profile-change
 * Rejette une demande de modification de profil Manager.
 * Notifie l'utilisateur dans le fil de discussion et par email.
 */
export async function POST(request: NextRequest) {
  try {
    const tokenHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdminCached(tokenHeader)

    const body = await request.json()
    const { threadId, reason } = body

    if (!threadId || typeof threadId !== 'string') {
      return NextResponse.json({ error: 'threadId requis.' }, { status: 400 })
    }

    const threadRef = adminDb.collection('support_threads').doc(threadId)
    const threadDoc = await threadRef.get()

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Ticket de support introuvable.' }, { status: 404 })
    }

    const threadData = threadDoc.data() || {}
    const userEmail = (threadData.userEmail || '').trim().toLowerCase()
    const userName = threadData.userName || 'Cher utilisateur'
    const cleanReason = (reason || "Informations non conformes aux exigences de gouvernance d'entreprise.").trim()

    const now = FieldValue.serverTimestamp()

    // 1. Message dans la discussion
    const chatMessage = `❌ [Action Support] Votre demande de modification de profil n'a pas pu être validée.

Motif : ${cleanReason}

Si vous avez des questions ou souhaitez apporter des justificatifs supplémentaires, vous pouvez répondre directement à ce message.`

    await threadRef.collection('messages').add({
      content: chatMessage,
      senderId: 'admin',
      senderRole: 'admin',
      createdAt: now
    })

    // 2. Mise à jour du ticket
    await threadRef.update({
      status: 'resolved',
      profileChangeStatus: 'rejected',
      profileChangeRejectedReason: cleanReason,
      lastMessage: 'Demande de modification rejetée par le support.',
      unreadByUser: true,
      unreadByAdmin: false,
      updatedAt: now
    })

    // 3. Email de notification
    if (userEmail) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Information concernant votre demande de modification de profil</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color: #475569; padding: 28px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">
                Sales Companion 2.0
              </h1>
              <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">
                Support & Sécurité des Comptes
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 14px;">
                Concernant votre demande de modification de profil
              </h2>
              <p style="font-size: 14.5px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
                Bonjour <strong>${userName}</strong>,
              </p>
              <p style="font-size: 14.5px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
                Notre équipe support a examiné votre demande de modification des informations d'entreprise. Pour des raisons de conformité, celle-ci n'a pas pu être validée.
              </p>
              <div style="background-color: #f8fafc; border-left: 4px solid #94a3b8; padding: 14px 16px; border-radius: 6px; margin: 0 0 24px;">
                <p style="margin: 0; font-size: 13.5px; color: #334155; line-height: 1.5;">
                  <strong>Motif indiqué :</strong> ${cleanReason}
                </p>
              </div>
              <p style="font-size: 14px; line-height: 1.6; color: #64748b;">
                Vous pouvez accéder à votre espace Support pour échanger avec notre équipe si vous avez besoin de précisions.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                © ${new Date().getFullYear()} Sales Companion 2.0. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
      await sendEmail({
        to: userEmail,
        subject: `Information concernant votre demande de modification de profil - Sales Companion 2.0`,
        html: emailHtml
      }).catch((err) => {
        console.warn('Erreur envoi email rejet profil (non-bloquant):', err)
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Demande rejetée avec succès. Utilisateur notifié.'
    })
  } catch (error: any) {
    if (error?.message === 'unauthenticated') {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }
    if (error?.message === 'forbidden') {
      return NextResponse.json({ error: 'Accès interdit.' }, { status: 403 })
    }
    console.error('Erreur rejet modification profil:', error)
    return NextResponse.json(
      { error: 'Erreur lors du rejet de la demande.' },
      { status: 500 }
    )
  }
}
