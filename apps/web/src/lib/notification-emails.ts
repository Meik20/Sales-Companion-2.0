import { sendEmail } from '@/utils/email'

export interface ProspectTransferEmailParams {
  to: string
  recipientName: string
  senderName: string
  count: number
  deadline?: string | null
}

export interface ProspectAssignmentEmailParams {
  to: string
  recipientName: string
  managerName: string
  companyName: string
  deadline?: string | null
  details?: {
    sector?: string | null
    city?: string | null
    phone?: string | null
    email?: string | null
  }
}

function formatDeadlineDate(deadline?: string | null): string {
  if (!deadline) return ''
  try {
    const d = new Date(deadline)
    if (isNaN(d.getTime())) return deadline
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return deadline
  }
}

/**
 * Envoie un email transactionnel au Team Manager lorsqu'un Senior Manager lui transfère des prospects.
 */
export async function sendProspectTransferEmail(params: ProspectTransferEmailParams) {
  const { to, recipientName, senderName, count, deadline } = params
  if (!to || !to.includes('@')) {
    console.warn('[notification-emails] Aucun email valide pour le transfert:', to)
    return { success: false, error: 'Email invalide' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://salescompanion2-0.com'
  const ctaLink = `${appUrl}/team?tab=imports`
  const formattedDeadline = formatDeadlineDate(deadline)

  const plural = count > 1
  const countLabel = `${count} prospect${plural ? 's' : ''}`
  const subject = `Sales Companion 2.0 — ${countLabel} transféré${plural ? 's' : ''} par votre Senior Manager`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 22px; font-weight: 800; color: #185FA5; letter-spacing: -0.5px;">Sales Companion 2.0</span>
      </div>

      <div style="background: #f0f7ff; border-left: 4px solid #185FA5; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0;">
          Nouveaux prospects transférés
        </h2>
        <p style="margin: 0; font-size: 14px; color: #334155;">
          Votre Senior Manager <strong>${senderName}</strong> vous a transféré <strong>${countLabel}</strong>.
        </p>
      </div>

      <p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
        Bonjour <strong>${recipientName}</strong>,
      </p>

      <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
        Ces prospects sont désormais disponibles dans votre espace de gestion d'équipe. Vous pouvez dès à présent les consulter et les attribuer aux commerciaux de votre équipe terrain.
      </p>

      ${
        formattedDeadline
          ? `
      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          Échéance d'intervention fixée
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #92400e;">
          ${formattedDeadline}
        </div>
      </div>
      `
          : ''
      }

      <div style="text-align: center; margin: 28px 0;">
        <a href="${ctaLink}" target="_blank" style="display: inline-block; background-color: #185FA5; color: #ffffff; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(24, 95, 165, 0.2);">
          Accéder à mes prospects importés
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 24px;">
        Ou accédez directement via : <br/>
        <a href="${ctaLink}" style="color: #185FA5; word-break: break-all;">${ctaLink}</a>
      </p>

      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
        Sales Companion 2.0 — Notification automatique de gouvernance commerciale d'entreprise.
      </p>
    </div>
  `

  try {
    return await sendEmail({
      to: to.trim(),
      subject,
      html
    })
  } catch (err) {
    console.error('[sendProspectTransferEmail] Exception envoi email:', err)
    return { success: false, error: err }
  }
}

/**
 * Envoie un email transactionnel au commercial terrain lorsqu'un prospect lui est assigné par son manager.
 */
export async function sendProspectAssignmentEmail(params: ProspectAssignmentEmailParams) {
  const { to, recipientName, managerName, companyName, deadline, details } = params
  if (!to || !to.includes('@')) {
    console.warn('[notification-emails] Aucun email valide pour l\'assignation:', to)
    return { success: false, error: 'Email invalide' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://salescompanion2-0.com'
  const ctaLink = `${appUrl}/pipeline`
  const formattedDeadline = formatDeadlineDate(deadline)

  const subject = `Sales Companion 2.0 — Nouveau prospect assigné : ${companyName}`

  const hasDetails =
    details && (details.sector || details.city || details.phone || details.email)

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 22px; font-weight: 800; color: #185FA5; letter-spacing: -0.5px;">Sales Companion 2.0</span>
      </div>

      <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0;">
          Nouveau prospect dans votre Sales Pipeline
        </h2>
        <p style="margin: 0; font-size: 14px; color: #334155;">
          Votre manager <strong>${managerName}</strong> vous a assigné le prospect <strong>${companyName}</strong>.
        </p>
      </div>

      <p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
        Bonjour <strong>${recipientName}</strong>,
      </p>

      <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
        Une nouvelle opportunité commerciale vous attend dans votre colonne <strong>Prospection</strong>. Vous pouvez dès à présent consulter la fiche, enregistrer vos premiers comptes-rendus d'appels et faire progresser le deal.
      </p>

      ${
        hasDetails
          ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px;">
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 8px; font-size: 14px;">Informations du prospect :</div>
        ${details.sector ? `<div style="margin-bottom: 4px; color: #475569;"><strong>Secteur :</strong> ${details.sector}</div>` : ''}
        ${details.city ? `<div style="margin-bottom: 4px; color: #475569;"><strong>Ville :</strong> ${details.city}</div>` : ''}
        ${details.phone ? `<div style="margin-bottom: 4px; color: #475569;"><strong>Téléphone :</strong> ${details.phone}</div>` : ''}
        ${details.email ? `<div style="color: #475569;"><strong>Email :</strong> ${details.email}</div>` : ''}
      </div>
      `
          : ''
      }

      ${
        formattedDeadline
          ? `
      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          Échéance d'intervention recommandée
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #92400e;">
          ${formattedDeadline}
        </div>
      </div>
      `
          : ''
      }

      <div style="text-align: center; margin: 28px 0;">
        <a href="${ctaLink}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2);">
          Ouvrir mon Sales Pipeline
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 24px;">
        Ou accédez directement via : <br/>
        <a href="${ctaLink}" style="color: #185FA5; word-break: break-all;">${ctaLink}</a>
      </p>

      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
        Sales Companion 2.0 — Votre assistant de productivité commerciale.
      </p>
    </div>
  `

  try {
    return await sendEmail({
      to: to.trim(),
      subject,
      html
    })
  } catch (err) {
    console.error('[sendProspectAssignmentEmail] Exception envoi email:', err)
    return { success: false, error: err }
  }
}
