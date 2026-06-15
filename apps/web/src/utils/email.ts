/**
 * Utility to send transactional emails via Brevo (Sendinblue) or SendGrid HTTP API without npm packages.
 */
export async function sendEmail({
  to,
  subject,
  html
}: {
  to: string
  subject: string
  html: string
}) {
  const brevoKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY
  const sendgridKey = process.env.SENDGRID_API_KEY

  if (brevoKey) {
    return await sendViaBrevo(to, subject, html, brevoKey)
  }

  if (sendgridKey) {
    return await sendViaSendGrid(to, subject, html, sendgridKey)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`[EMAIL SIMULATED] (No API key found in environment)`)
  console.log(`To: ${to}`)
  console.log(`Subject: ${subject}`)
  console.log(`Body preview: ${html.substring(0, 300)}...`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  return { success: true, simulated: true }
}

async function sendViaBrevo(to: string, subject: string, html: string, apiKey: string) {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Sales Companion 2.0', email: 'no-reply@salescompanion2-0.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
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

async function sendViaSendGrid(to: string, subject: string, html: string, apiKey: string) {
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'no-reply@salescompanion2-0.com', name: 'Sales Companion' },
        subject,
        content: [{ type: 'text/html', value: html }]
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
