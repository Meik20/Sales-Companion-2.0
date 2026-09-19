import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { sendEmail } from '@/utils/email'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/support/reply
 * Répond à un ticket support utilisateur et envoie un email de notification
 * via no-reply (noreply@salescompanion2-0.com).
 */
export async function POST(request: NextRequest) {
  try {
    const tokenHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    const adminUid = await verifyAdminCached(tokenHeader)

    const body = await request.json()
    const { threadId, message } = body

    if (!threadId || !message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Données manquantes (threadId et message requis).' },
        { status: 400 }
      )
    }

    const trimmedMessage = message.trim()

    // 1. Récupérer le ticket support existant
    const threadRef = adminDb.collection('support_threads').doc(threadId)
    const threadSnap = await threadRef.get()

    if (!threadSnap.exists) {
      return NextResponse.json({ error: 'Ticket introuvable.' }, { status: 404 })
    }

    const threadData = threadSnap.data()

    // 2. Enregistrer le message de l'admin dans la sous-collection 'messages'
    const messageRef = threadRef.collection('messages').doc()
    await messageRef.set({
      content: trimmedMessage,
      senderId: adminUid,
      senderRole: 'admin',
      createdAt: FieldValue.serverTimestamp()
    })

    // 3. Mettre à jour le ticket support
    await threadRef.update({
      lastMessage: trimmedMessage.slice(0, 80),
      updatedAt: FieldValue.serverTimestamp(),
      unreadByUser: true,
      unreadByAdmin: false,
      status: 'open'
    })

    // 4. Déterminer l'email et le nom de l'utilisateur destinataire
    let recipientEmail = threadData?.userEmail as string | undefined
    const recipientName = (threadData?.userName as string | undefined)?.trim() || 'Cher utilisateur'
    const threadSubject = (threadData?.subject as string | undefined)?.trim() || 'Votre demande au Support'

    // Fallback : si l'email n'était pas stocké directement sur le ticket mais qu'on a le userId
    if ((!recipientEmail || !recipientEmail.includes('@')) && threadData?.userId) {
      try {
        const userDoc = await adminDb.collection('users').doc(threadData.userId).get()
        if (userDoc.exists && userDoc.data()?.email) {
          recipientEmail = userDoc.data()?.email
        } else {
          const authUser = await adminAuth.getUser(threadData.userId)
          if (authUser.email) {
            recipientEmail = authUser.email
          }
        }
      } catch (e) {
        console.warn('[support/reply] Fallback recherche email utilisateur échouée:', e)
      }
    }

    let emailSent = false

    // 5. Envoi de l'email transactionnel de notification si un email valide est trouvé
    if (recipientEmail && recipientEmail.includes('@')) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://salescompanion2-0.com'
      const ticketUrl = `${appUrl}/support?ticket=${encodeURIComponent(threadId)}`

      // Échappement HTML basique pour le message inséré
      const safeMessage = trimmedMessage
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>')

      const safeSubject = threadSubject
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle réponse du Support Sales Companion</title>
</head>
<body style="margin:0;padding:0;background-color:#0b1120;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b1120;padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:580px;background-color:#131c2e;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 20px;text-align:center;border-bottom:1px solid #1e293b;background:linear-gradient(180deg, rgba(27,122,62,0.15) 0%, rgba(19,28,46,0) 100%);">
              <div style="display:inline-block;padding:6px 14px;background:rgba(27,122,62,0.2);border:1px solid rgba(27,122,62,0.4);border-radius:8px;font-weight:700;font-size:14px;color:#4ade80;letter-spacing:0.5px;">
                SALES COMPANION 2.0 · SUPPORT
              </div>
              <h1 style="margin:18px 0 6px;font-size:20px;font-weight:700;color:#ffffff;">
                Nouvelle réponse à votre ticket 🎧
              </h1>
              <p style="margin:0;font-size:13px;color:#94a3b8;">
                Ticket : « ${safeSubject} »
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#e2e8f0;">
                Bonjour <strong>${recipientName}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#94a3b8;">
                Notre équipe support vient de répondre à votre demande. Voici un aperçu de la réponse :
              </p>

              <!-- Message Preview Card -->
              <table width="100%" style="background-color:#1e2a3b;border-left:4px solid #1B7A3E;border-radius:8px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                      Réponse de l'agent Support
                    </div>
                    <div style="font-size:13.5px;color:#f1f5f9;line-height:1.6;">
                      ${safeMessage}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#e2e8f0;">
                Pour consulter l'intégralité de vos échanges ou continuer la discussion avec notre équipe, cliquez sur le bouton ci-dessous :
              </p>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${ticketUrl}" target="_blank" style="display:inline-block;padding:13px 28px;background-color:#1B7A3E;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;box-shadow:0 4px 14px rgba(27,122,62,0.4);">
                      Accéder à mon ticket →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
                Lien direct vers votre ticket :
              </p>
              <p style="margin:0 0 20px;font-size:11px;word-break:break-all;color:#38bdf8;">
                ${ticketUrl}
              </p>

              <div style="border-top:1px solid #1e293b;padding-top:16px;font-size:11.5px;color:#64748b;line-height:1.5;">
                ℹ️ <strong>Rappel :</strong> Vous pouvez également retrouver tous vos tickets à tout moment depuis votre espace Sales Companion dans l'onglet <strong>Support</strong>.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;text-align:center;background-color:#0f172a;border-top:1px solid #1e293b;font-size:11px;color:#64748b;line-height:1.5;">
              © ${new Date().getFullYear()} Sales Companion 2.0 — Plateforme d'Intelligence Commerciale B2B.<br>
              <em>Cet email a été envoyé automatiquement depuis l'adresse de notification noreply@salescompanion2-0.com. Merci de ne pas y répondre directement par courriel.</em>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `

      const textFallback = `Bonjour ${recipientName},\n\nNotre équipe support vient de répondre à votre ticket : « ${threadSubject} ».\n\nRéponse du support :\n${trimmedMessage}\n\nPour consulter l'historique et répondre :\n${ticketUrl}\n\nCordialement,\nL'équipe Support Sales Companion\n(Email automatique envoyé via noreply@salescompanion2-0.com - ne pas répondre directement)`

      try {
        const emailResult = await sendEmail({
          to: recipientEmail,
          subject: `🎧 [Support Sales Companion] Réponse à votre ticket : ${threadSubject}`,
          html: emailHtml,
          text: textFallback
        })
        emailSent = emailResult?.success ?? false
      } catch (e) {
        console.error('[support/reply] Erreur lors de l\'envoi de l\'email:', e)
      }
    }

    return NextResponse.json({
      success: true,
      messageId: messageRef.id,
      emailSent,
      recipientEmail: recipientEmail ? 'sent' : 'none'
    })
  } catch (error: any) {
    console.error('[support/reply POST]', error)
    if (error?.message === 'unauthenticated') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (error?.message === 'forbidden') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'envoi de la réponse." },
      { status: 500 }
    )
  }
}
