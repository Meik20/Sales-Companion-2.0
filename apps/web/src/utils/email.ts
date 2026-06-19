/**
 * Utility to send transactional emails via Brevo (Sendinblue) or SendGrid HTTP API without npm packages.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text
}: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  const brevoKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY
  const sendgridKey = process.env.SENDGRID_API_KEY

  if (brevoKey) {
    return await sendViaBrevo(to, subject, html, brevoKey, text)
  }

  if (sendgridKey) {
    return await sendViaSendGrid(to, subject, html, sendgridKey, text)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`[EMAIL SIMULATED] (No API key found in environment)`)
  console.log(`To: ${to}`)
  console.log(`Subject: ${subject}`)
  console.log(`Body preview: ${html.substring(0, 300)}...`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  return { success: true, simulated: true }
}

async function sendViaBrevo(to: string, subject: string, html: string, apiKey: string, text?: string) {
  try {
    const payload: any = {
      sender: { name: 'Sales Companion', email: 'noreply@salescompanion2-0.com' },
      replyTo: { name: 'Support Sales Companion', email: 'noreply@salescompanion2-0.com' },
      to: [{ email: to }],
      subject,
      htmlContent: html
    }
    if (text) payload.textContent = text

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[email-brevo] Error:', err)
      return { success: false, error: err }
    }

    console.log(`[email-brevo] Email successfully sent to ${to}`)
    return { success: true }
  } catch (error) {
    console.error('[email-brevo] Exception:', error)
    return { success: false, error }
  }
}

async function sendViaSendGrid(to: string, subject: string, html: string, apiKey: string, text?: string) {
  try {
    const content = [{ type: 'text/html', value: html }]
    if (text) content.unshift({ type: 'text/plain', value: text })

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@salescompanion2-0.com', name: 'Sales Companion' },
        reply_to: { email: 'noreply@salescompanion2-0.com', name: 'Support Sales Companion' },
        subject,
        content
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[email-sendgrid] Error:', err)
      return { success: false, error: err }
    }

    console.log(`[email-sendgrid] Email successfully sent to ${to}`)
    return { success: true }
  } catch (error) {
    console.error('[email-sendgrid] Exception:', error)
    return { success: false, error }
  }
}
