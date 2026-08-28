/**
 * Liste des fournisseurs de messagerie grand public / gratuits
 */
export const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.fr',
  'yahoo.co.uk',
  'hotmail.com',
  'hotmail.fr',
  'outlook.com',
  'outlook.fr',
  'live.com',
  'live.fr',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'zoho.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'gmx.com',
  'gmx.fr',
  'yandex.com',
  'yandex.ru',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'sfr.fr',
  'laposte.net'
])

/**
 * Extrait le nom de domaine d'une adresse email
 */
export function getDomainFromEmail(email: string): string {
  if (!email || typeof email !== 'string') return ''
  const parts = email.trim().toLowerCase().split('@')
  return parts.length === 2 ? (parts[1] ?? '').trim() : ''
}

/**
 * Vérifie si une adresse email est une adresse professionnelle (avec nom de domaine propre).
 * Retourne false pour les adresses grand public (gmail, yahoo, hotmail, etc.).
 */
export function isCorporateEmail(email: string): boolean {
  const domain = getDomainFromEmail(email)
  if (!domain || !domain.includes('.')) return false

  // Vérifier si le domaine fait partie de la liste des webmails gratuits
  return !FREE_EMAIL_DOMAINS.has(domain)
}
