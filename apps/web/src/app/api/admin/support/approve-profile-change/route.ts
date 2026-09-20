import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { sendEmail } from '@/utils/email'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/support/approve-profile-change
 * Valide une demande de modification de profil Manager.
 * Génère un jeton valable 24h, l'envoie dans le fil de discussion et par email.
 */
export async function POST(request: NextRequest) {
  try {
    const tokenHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdminCached(tokenHeader)

    const body = await request.json()
    const { threadId } = body

    if (!threadId || typeof threadId !== 'string') {
      return NextResponse.json({ error: 'threadId requis.' }, { status: 400 })
    }

    const threadRef = adminDb.collection('support_threads').doc(threadId)
    const threadDoc = await threadRef.get()

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Ticket de support introuvable.' }, { status: 404 })
    }

    const threadData = threadDoc.data() || {}
    const userId = threadData.userId
    const userEmail = (threadData.userEmail || '').trim().toLowerCase()
    const userName = threadData.userName || 'Cher utilisateur'
    const companyName = threadData.companyName || 'votre entreprise'

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Informations utilisateur incomplètes sur ce ticket.' },
        { status: 400 }
      )
    }

    // 1. Génération du jeton sécurisé (valide 24 heures)
    const editToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const expiresAtTimestamp = Timestamp.fromDate(expiresAt)
    const now = FieldValue.serverTimestamp()

    // Enregistrement du token dans la collection profile_edit_tokens
    await adminDb.collection('profile_edit_tokens').doc(editToken).set({
      token: editToken,
      userId,
      userEmail,
      threadId,
      status: 'active',
      createdAt: now,
      expiresAt: expiresAtTimestamp,
      used: false
    })

    // Mise à jour de l'utilisateur pour autoriser l'édition
    await adminDb.collection('users').doc(userId).update({
      profileEditAuthorizedUntil: expiresAtTimestamp,
      profileEditToken: editToken
    })

    // Construction du lien direct
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      'https://salescompanion2-0.com'
    const editLink = `${appUrl}/profile?edit_token=${encodeURIComponent(editToken)}`

    // 2. Envoi du message dans la messagerie interne du ticket
    const chatMessage = `✅ [Action Support] Votre demande de modification de profil a été validée par notre équipe !

Vous pouvez dès maintenant mettre à jour les informations de votre compte Manager en cliquant sur ce lien sécurisé :
${editLink}

⏳ Note : Pour des raisons de sécurité et de conformité d'entreprise, ce lien d'autorisation est valable pendant 24 heures.`

    await threadRef.collection('messages').add({
      content: chatMessage,
      senderId: 'admin',
      senderRole: 'admin',
      createdAt: now
    })

    // 3. Mise à jour du statut du ticket
    await threadRef.update({
      status: 'resolved',
      profileChangeStatus: 'approved',
      profileChangeToken: editToken,
      profileChangeApprovedAt: now,
      lastMessage: 'Demande de modification approuvée par le support.',
      unreadByUser: true,
      unreadByAdmin: false,
      updatedAt: now
    })

    // 4. Envoi de l'email transactionnel
    const expirationHoursFormatted = '24 heures'
    const expirationDateFormatted = expiresAt.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande de modification de profil validée</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 32px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                Sales Companion <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px;">2.0</span>
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">
                Support & Gestion de Compte
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin: 0 0 16px;">
                Votre demande de modification a été validée ! 🎉
              </h2>

              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
                Bonjour <strong>${userName}</strong>,
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
                Suite à votre échange avec notre équipe support, la modification des informations de votre compte Manager (Entreprise : <strong>${companyName}</strong>) a été approuvée.
              </p>

              <!-- Warning Callout -->
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 6px; margin: 0 0 28px;">
                <p style="margin: 0; font-size: 13.5px; color: #1e40af; line-height: 1.5;">
                  ⏱️ <strong>Validité :</strong> Ce lien sécurisé est actif pendant <strong>${expirationHoursFormatted}</strong> (jusqu'au ${expirationDateFormatted}).
                </p>
              </div>

              <!-- Button CTA -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${editLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.35);">
                  Mettre à jour mon profil →
                </a>
              </div>

              <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 28px 0 0; word-break: break-all;">
                Si le bouton ci-dessus ne fonctionne pas, copiez-collez l'adresse suivante dans votre navigateur :<br>
                <a href="${editLink}" style="color: #2563eb; text-decoration: underline;">${editLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                © ${new Date().getFullYear()} Sales Companion 2.0. Tous droits réservés.<br>
                Pour des raisons de gouvernance, ce lien est strictement personnel.
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
      subject: `✅ Modification de profil autorisée - Sales Companion 2.0`,
      html: emailHtml
    }).catch((err) => {
      console.warn('Erreur envoi email modification profil (non-bloquant):', err)
    })

    return NextResponse.json({
      success: true,
      token: editToken,
      link: editLink,
      message: 'Demande approuvée avec succès. Lien envoyé par email et dans le chat.'
    })
  } catch (error: any) {
    if (error?.message === 'unauthenticated') {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }
    if (error?.message === 'forbidden') {
      return NextResponse.json({ error: 'Accès interdit.' }, { status: 403 })
    }
    console.error('Erreur approbation modification profil:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'approbation de la demande." },
      { status: 500 }
    )
  }
}
