import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { sendEmail } from '@/utils/email'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/support/create-thread
 * Permet à un administrateur d'initier un ticket de support directement avec un utilisateur,
 * et d'envoyer une notification par email à cet utilisateur.
 */
export async function POST(request: NextRequest) {
  try {
    const tokenHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    const adminUid = await verifyAdminCached(tokenHeader)

    const body = await request.json()
    const { userId, subject, message } = body

    if (!userId || !subject || !message) {
      return NextResponse.json(
        { error: 'Données manquantes (userId, subject et message requis).' },
        { status: 400 }
      )
    }

    const trimmedSubject = String(subject).trim()
    const trimmedMessage = String(message).trim()

    if (!trimmedSubject || !trimmedMessage) {
      return NextResponse.json(
        { error: 'Le sujet et le message ne peuvent pas être vides.' },
        { status: 400 }
      )
    }

    // 1. Récupérer les informations de l'utilisateur destinataire
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.exists ? userDoc.data() : null

    let recipientEmail = userData?.email as string | undefined
    let recipientName = (userData?.name || userData?.displayName) as string | undefined

    if (!recipientEmail) {
      try {
        const authUser = await adminAuth.getUser(userId)
        recipientEmail = authUser.email
        if (!recipientName) recipientName = authUser.displayName || 'Utilisateur'
      } catch (err) {
        console.warn('[support/create-thread] auth.getUser failed:', err)
      }
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Impossible de localiser l'adresse email de l'utilisateur." },
        { status: 404 }
      )
    }

    const companyName = userData?.companyName || userData?.company || ''
    const phone = userData?.phone || ''
    const sector = userData?.sector || ''

    // 2. Créer le document dans 'support_threads'
    const threadRef = adminDb.collection('support_threads').doc()
    await threadRef.set({
      userId,
      userEmail: recipientEmail,
      userName: recipientName || 'Utilisateur',
      companyName,
      phone,
      sector,
      subject: trimmedSubject,
      status: 'open',
      type: 'admin_outreach',
      lastMessage: trimmedMessage.slice(0, 100),
      unreadByUser: true,
      unreadByAdmin: false,
      initiatedByAdmin: true,
      adminUid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    // 3. Ajouter le premier message dans la sous-collection 'messages'
    const messageRef = threadRef.collection('messages').doc()
    await messageRef.set({
      content: trimmedMessage,
      senderId: adminUid,
      senderRole: 'admin',
      createdAt: FieldValue.serverTimestamp()
    })

    // 4. Envoyer l'email transactionnel de notification au destinataire
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://salescompanion2-0.com'
      const ticketUrl = `${appUrl}/support?ticket=${encodeURIComponent(threadRef.id)}`

      const safeMessage = trimmedMessage
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>')

      const safeSubject = trimmedSubject
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau message du Support Sales Companion 2.0</title>
</head>
<body style="margin:0;padding:0;background-color:#0b1120;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b1120;padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:580px;background-color:#131c2e;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:32px 32px 20px;text-align:center;border-bottom:1px solid #1e293b;background:linear-gradient(180deg, rgba(37,99,235,0.15) 0%, rgba(19,28,46,0) 100%);">
              <div style="display:inline-block;padding:6px 14px;background:rgba(37,99,235,0.2);border:1px solid rgba(37,99,235,0.4);border-radius:8px;font-weight:700;font-size:14px;color:#60a5fa;letter-spacing:0.5px;">
                SALES COMPANION 2.0 · SUPPORT
              </div>
              <h1 style="margin:18px 0 6px;font-size:20px;font-weight:700;color:#ffffff;">
                Nouveau message de l'équipe Support
              </h1>
              <p style="margin:0;font-size:14px;color:#94a3b8;">
                Objet : <strong style="color:#f1f5f9;">${safeSubject}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Bonjour <strong style="color:#f1f5f9;">${recipientName || 'Cher utilisateur'}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#94a3b8;">
                L'équipe Sales Companion 2.0 vous a envoyé un message :
              </p>
              <div style="margin:20px 0;padding:20px;background-color:#1e293b;border-left:4px solid #2563eb;border-radius:6px;font-size:14px;line-height:1.6;color:#f8fafc;">
                ${safeMessage}
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:28px 0 16px;">
                <tr>
                  <td align="center">
                    <a href="${ticketUrl}" target="_blank" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;box-shadow:0 4px 14px rgba(37,99,235,0.4);">
                      Accéder à la conversation →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#64748b;text-align:center;line-height:1.5;">
                Vous pouvez répondre directement en vous connectant à votre espace client.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#0d1527;border-top:1px solid #1e293b;text-align:center;font-size:12px;color:#64748b;">
              © ${new Date().getFullYear()} Sales Companion 2.0 · B2B Cameroun · Tous droits réservés.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

      await sendEmail({
        to: recipientEmail,
        subject: `[Support Sales Companion 2.0] ${trimmedSubject}`,
        html: emailHtml
      })
    } catch (emailErr) {
      console.error('[support/create-thread] Failed to send email notification:', emailErr)
    }

    return NextResponse.json({
      success: true,
      threadId: threadRef.id
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg === 'unauthenticated') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (msg === 'forbidden') {
      return NextResponse.json({ error: 'Accès refusé (admin requis)' }, { status: 403 })
    }
    console.error('[POST /api/admin/support/create-thread] Error:', error)
    return NextResponse.json({ error: `Erreur interne: ${msg}` }, { status: 500 })
  }
}
