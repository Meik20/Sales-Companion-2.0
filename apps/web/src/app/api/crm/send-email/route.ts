export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { sendEmail } from '@/utils/email'

/**
 * POST /api/crm/send-email
 * Permet à un agent support d'envoyer un email directement à un client CRM.
 * L'email est envoyé depuis l'adresse noreply mais avec le reply-to de l'agent.
 * L'action est historisée dans crm_activities.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    let agentUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      agentUid = decoded.uid
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Récupérer les infos de l'agent (support ou autre)
    const agentDoc = await adminDb.collection('users').doc(agentUid).get()
    const agentData = agentDoc.data()
    const agentName: string = agentData?.name || agentData?.displayName || 'Agent Support'
    const agentEmail: string | undefined = agentData?.email

    const body = await request.json()
    const { clientId, clientEmail, clientName, subject, message } = body

    if (!clientId || !clientEmail || !subject || !message) {
      return NextResponse.json(
        { error: 'Données manquantes (clientId, clientEmail, subject, message requis).' },
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

    // Construire le corps HTML de l'email
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

    const safeClientName = (clientName || 'Cher client')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const safeAgentName = agentName
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
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
                Message de votre équipe Support
              </h1>
              <p style="margin:0;font-size:14px;color:#94a3b8;">
                Objet&nbsp;: <strong style="color:#f1f5f9;">${safeSubject}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Bonjour <strong style="color:#f1f5f9;">${safeClientName}</strong>,
              </p>
              <div style="margin:20px 0;padding:20px;background-color:#1e293b;border-left:4px solid #2563eb;border-radius:6px;font-size:14px;line-height:1.6;color:#f8fafc;">
                ${safeMessage}
              </div>
              <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">
                Ce message vous a été envoyé par <strong style="color:#94a3b8;">${safeAgentName}</strong> de l'équipe Sales Companion 2.0.${agentEmail ? `<br>Pour répondre directement, écrivez à&nbsp;: <a href="mailto:${agentEmail}" style="color:#60a5fa;">${agentEmail}</a>` : ''}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#0d1527;border-top:1px solid #1e293b;text-align:center;font-size:12px;color:#64748b;">
              © ${new Date().getFullYear()} Sales Companion 2.0 · Tous droits réservés.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    // Envoyer l'email (reply-to = adresse de l'agent si disponible)
    const emailOptions: Parameters<typeof sendEmail>[0] & { replyTo?: string } = {
      to: clientEmail,
      subject: trimmedSubject,
      html: emailHtml
    }

    // On patch sendEmail via options étendues — le replyTo est géré côté Brevo/SendGrid
    // On passe agentEmail dans le body pour que sendEmail puisse l'utiliser si besoin
    const emailResult = await sendEmailWithReplyTo({
      to: clientEmail,
      subject: trimmedSubject,
      html: emailHtml,
      replyTo: agentEmail,
      replyToName: agentName
    })

    if (!emailResult.success && !emailResult.simulated) {
      return NextResponse.json({ error: 'Échec de l\'envoi de l\'email.' }, { status: 502 })
    }

    // Historiser l'action dans crm_activities
    const now = FieldValue.serverTimestamp()
    await adminDb.collection('crm_activities').add({
      clientId,
      type: 'email',
      title: `Email support : ${trimmedSubject}`,
      description: trimmedMessage.slice(0, 300),
      performedBy: agentUid,
      performedByName: agentName,
      createdAt: now
    })

    // Mettre à jour lastActivityAt sur le client CRM
    try {
      const crmRef = adminDb.collection('crm_clients').doc(clientId)
      const crmSnap = await crmRef.get()
      if (crmSnap.exists) {
        await crmRef.update({
          lastActivityAt: now,
          lastActivityType: 'email',
          lastActivityTitle: `Email support : ${trimmedSubject}`,
          updatedAt: now
        })
      }
    } catch (err) {
      console.error('[crm/send-email] Failed to update client lastActivity:', err)
    }

    return NextResponse.json({ success: true, simulated: emailResult.simulated ?? false })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/crm/send-email] Error:', error)
    return NextResponse.json({ error: `Erreur interne: ${msg}` }, { status: 500 })
  }
}

/**
 * Wrapper autour de sendEmail pour injecter le reply-to de l'agent.
 * Priorité : Brevo, puis SendGrid, puis simulation.
 */
async function sendEmailWithReplyTo({
  to,
  subject,
  html,
  replyTo,
  replyToName
}: {
  to: string
  subject: string
  html: string
  replyTo?: string
  replyToName?: string
}): Promise<{ success: boolean; simulated?: boolean; error?: unknown }> {
  const brevoKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY
  const sendgridKey = process.env.SENDGRID_API_KEY

  if (brevoKey) {
    try {
      const payload: Record<string, unknown> = {
        sender: { name: 'Sales Companion 2.0', email: 'noreply@salescompanion2-0.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html
      }
      if (replyTo) {
        payload.replyTo = { email: replyTo, name: replyToName || replyTo }
      }

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[crm-email-brevo] Error:', err)
        return { success: false, error: err }
      }

      return { success: true }
    } catch (error) {
      console.error('[crm-email-brevo] Exception:', error)
      return { success: false, error }
    }
  }

  if (sendgridKey) {
    try {
      const payload: Record<string, unknown> = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@salescompanion2-0.com', name: 'Sales Companion 2.0' },
        subject,
        content: [{ type: 'text/html', value: html }]
      }
      if (replyTo) {
        payload.reply_to = { email: replyTo, name: replyToName || replyTo }
      }

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[crm-email-sendgrid] Error:', err)
        return { success: false, error: err }
      }

      return { success: true }
    } catch (error) {
      console.error('[crm-email-sendgrid] Exception:', error)
      return { success: false, error }
    }
  }

  // Mode simulation (pas de clé API configurée)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`[CRM EMAIL SIMULATED] To: ${to} | Subject: ${subject}`)
  console.log(`Reply-To: ${replyTo ?? 'N/A'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  return { success: true, simulated: true }
}
