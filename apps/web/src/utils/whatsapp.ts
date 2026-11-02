import { COUNTRY_DIAL_CODES, SUPPORTED_COUNTRIES } from '@sales-companion/shared'

/**
 * Type des scripts commerciaux prêts à l'emploi.
 */
export type WhatsAppScriptType = 'intro' | 'quote' | 'followup' | 'stagnant'

export interface WhatsAppScriptMeta {
  id: WhatsAppScriptType
  labelFr: string
  labelEn: string
  descriptionFr: string
  descriptionEn: string
}

export const WHATSAPP_SALES_SCRIPTS: WhatsAppScriptMeta[] = [
  {
    id: 'intro',
    labelFr: 'Premier contact / Présentation',
    labelEn: 'First contact / Introduction',
    descriptionFr: 'Introduction cordiale et proposition de découverte (5 min)',
    descriptionEn: 'Warm introduction and 5-min discovery chat'
  },
  {
    id: 'quote',
    labelFr: 'Devis / Proposition prête',
    labelEn: 'Quote / Proposal ready',
    descriptionFr: 'Notification de proposition commerciale prête pour revue',
    descriptionEn: 'Notify that the commercial proposal is ready for review'
  },
  {
    id: 'followup',
    labelFr: 'Relance douce & Suivi',
    labelEn: 'Gentle follow-up',
    descriptionFr: 'Prise de nouvelles suite à une offre envoyée',
    descriptionEn: 'Check in on sent proposal and answer questions'
  },
  {
    id: 'stagnant',
    labelFr: 'Déblocage lead dormant',
    labelEn: 'Reactivate dormant lead',
    descriptionFr: 'Relance respectueuse pour qualifier si le projet est toujours actif',
    descriptionEn: 'Polite check to confirm if the project is still a priority'
  }
]

export interface WhatsAppMessageParams {
  companyName?: string | null
  contactName?: string | null
  salespersonName?: string | null
  myCompanyName?: string | null
}

/**
 * Génère un message commercial percutant pré-rempli pour WhatsApp.
 */
export function getWhatsAppSalesMessage(
  scriptType: WhatsAppScriptType,
  params: WhatsAppMessageParams,
  lang: 'fr' | 'en' = 'fr'
): string {
  const company = params.companyName?.trim() || (lang === 'en' ? 'your company' : 'votre entreprise')
  const contact = params.contactName?.trim() || (lang === 'en' ? 'Sir/Madam' : 'Bonjour')
  const salesperson = params.salespersonName?.trim() || ''
  const myCompany = params.myCompanyName?.trim() || 'Sales Companion'

  const isEn = lang === 'en'

  switch (scriptType) {
    case 'intro':
      if (isEn) {
        return salesperson
          ? `Hello ${contact}, this is ${salesperson} from ${myCompany}. I have been following ${company}'s great work and would love a quick 5-min chat regarding your current opportunities. Would you be available this week?`
          : `Hello ${contact}, I have been following ${company}'s work and would love a quick 5-min chat regarding your current opportunities. Would you be available this week?`
      }
      return salesperson
        ? `Bonjour ${contact}, je suis ${salesperson} de ${myCompany}. J'ai découvert les activités de ${company} et serais ravi d'échanger 5 min sur vos opportunités actuelles. Seriez-vous disponible cette semaine ?`
        : `Bonjour ${contact}, j'ai découvert les activités de ${company} et serais ravi d'échanger 5 min sur vos opportunités actuelles. Seriez-vous disponible cette semaine ?`

    case 'quote':
      if (isEn) {
        return `Hello ${contact}, following our recent discussion, our proposal for ${company} is ready! When would you be available for a brief walkthrough together?`
      }
      return `Bonjour ${contact}, suite à notre échange, notre proposition commerciale pour ${company} est prête ! Quand seriez-vous disponible pour que nous la parcourions ensemble ?`

    case 'followup':
      if (isEn) {
        return `Hello ${contact}, just checking in regarding our proposal for ${company}. Did you have a chance to review it, or do you have any questions I can clarify?`
      }
      return `Bonjour ${contact}, je me permets de revenir vers vous concernant notre proposition pour ${company}. Avez-vous pu y jeter un œil ou avez-vous des questions ?`

    case 'stagnant':
      if (isEn) {
        return `Hello ${contact}, I know your schedule is very busy. Is our project with ${company} still a priority for this month, or would you prefer us to reconnect later?`
      }
      return `Bonjour ${contact}, je sais que votre emploi du temps est très chargé. Notre projet avec ${company} est-il toujours d'actualité ce mois-ci, ou préférez-vous que nous reprenions contact plus tard ?`

    default:
      return isEn
        ? `Hello ${contact}, I am following up on our discussion regarding ${company}.`
        : `Bonjour ${contact}, je vous contacte suite à nos échanges concernant ${company}.`
  }
}

/**
 * Formate un numéro de téléphone au format international WhatsApp de manière dynamique et universelle.
 * Respecte le pays de l'organisation ou du prospect (CM, SN, CI, BJ, TG, TD, CF, etc.) sans hardcoding.
 */
export function formatWhatsAppNumber(phone: string, countryCode?: string | null): string | null {
  if (!phone) return null

  const trimmed = phone.trim()
  const cleanNumber = trimmed.replace(/\D/g, '')
  if (!cleanNumber) return null

  // 1. Si le numéro commence déjà explicitement par + ou 00
  const hadLeadingPlus = trimmed.startsWith('+') || trimmed.startsWith('00')

  // 2. Déterminer l'indicatif cible si un pays est fourni
  const resolvedCode = countryCode ? countryCode.toUpperCase() : null
  const targetDialWithPlus = resolvedCode && resolvedCode in COUNTRY_DIAL_CODES
    ? COUNTRY_DIAL_CODES[resolvedCode]
    : null
  const targetDialDigits = targetDialWithPlus ? targetDialWithPlus.replace(/\D/g, '') : null

  // 3. Vérifier si le numéro commence déjà par un indicatif connu de SUPPORTED_COUNTRIES
  const knownCountry = SUPPORTED_COUNTRIES.find((c) => {
    const dDigits = c.dialCode.replace(/\D/g, '')
    return cleanNumber.startsWith(dDigits) && cleanNumber.length >= dDigits.length + 7
  })

  // Si l'utilisateur a saisi un indicatif complet ou si c'est déjà un numéro international
  if (hadLeadingPlus) {
    return cleanNumber
  }

  if (targetDialDigits) {
    // Si déjà préfixé par l'indicatif du pays cible
    if (cleanNumber.startsWith(targetDialDigits) && cleanNumber.length >= targetDialDigits.length + 7) {
      return cleanNumber
    }

    // Gestion des numéros locaux avec zéro initial (ex: Côte d'Ivoire "07...", France "06...")
    let localDigits = cleanNumber
    if (localDigits.startsWith('0') && localDigits.length > 8) {
      localDigits = localDigits.substring(1)
    }

    return `${targetDialDigits}${localDigits}`
  }

  // 4. Si aucun countryCode fourni mais commence par un indicatif supporté
  if (knownCountry) {
    return cleanNumber
  }

  // 5. Fallback universel : si le numéro fait 9 chiffres et commence par 6/2 (numéro mobile local Cameroun par défaut historique)
  if (cleanNumber.length === 9 && (cleanNumber.startsWith('6') || cleanNumber.startsWith('2'))) {
    return `237${cleanNumber}`
  }

  if (cleanNumber.length === 10 && (cleanNumber.startsWith('06') || cleanNumber.startsWith('02'))) {
    return `237${cleanNumber.substring(1)}`
  }

  return cleanNumber
}

/**
 * Génère une URL WhatsApp Click-to-Chat complète avec numéro normalisé et message encodé.
 */
export function getWhatsAppUrl(
  phone: string,
  text?: string,
  countryCode?: string | null
): string {
  const formatted = formatWhatsAppNumber(phone, countryCode)
  const phoneDigits = formatted || phone.replace(/\D/g, '')
  const baseUrl = `https://wa.me/${phoneDigits}`

  if (text) {
    return `${baseUrl}?text=${encodeURIComponent(text)}`
  }
  return baseUrl
}
