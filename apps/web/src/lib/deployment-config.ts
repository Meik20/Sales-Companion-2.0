/**
 * Configuration de Déploiement — Sales Companion 2.0
 * 
 * Permet de basculer l'application entre :
 * 1. 'public' (SaaS standard ouvert à tous les utilisateurs, indépendants et entreprises)
 * 2. 'enterprise' (Instance métier dédiée et privée pour une entreprise spécifique)
 *
 * Variables d'environnement supportées :
 * - NEXT_PUBLIC_DEPLOYMENT_MODE : 'public' (défaut) | 'enterprise'
 * - NEXT_PUBLIC_ENTERPRISE_NAME : Nom de l'entreprise cliente (ex: "Groupe SABC", "Afriland First Bank")
 * - NEXT_PUBLIC_ENTERPRISE_LOGO_URL : URL optionnelle du logo de l'entreprise
 * - NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS : Liste séparée par virgules des domaines autorisés (ex: "groupe-sabc.cm,sabc.com")
 * - NEXT_PUBLIC_DEDICATED_ORG_CODE : Code organisation verrouillé pour l'instance (ex: "SC-CM-SABC1")
 */

const mode = (process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || 'public').trim().toLowerCase() as 'public' | 'enterprise'
const isEnterprise = mode === 'enterprise'
const enterpriseName = (process.env.NEXT_PUBLIC_ENTERPRISE_NAME || '').trim()
const enterpriseLogoUrl = (process.env.NEXT_PUBLIC_ENTERPRISE_LOGO_URL || '').trim()
const dedicatedOrgCode = (process.env.NEXT_PUBLIC_DEDICATED_ORG_CODE || '').trim().toUpperCase()

const rawDomains = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS || ''
const allowedEmailDomains = rawDomains
  .split(',')
  .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
  .filter(Boolean)

export const DEPLOYMENT_CONFIG = {
  mode,
  isEnterprise,
  enterpriseName,
  enterpriseLogoUrl,
  dedicatedOrgCode,
  allowedEmailDomains,

  /**
   * Vérifie si une adresse e-mail appartient aux domaines autorisés en mode entreprise.
   * Retourne true si aucun domaine spécifique n'est restreint ou si l'e-mail correspond.
   */
  isDomainAllowed(email: string): boolean {
    if (!isEnterprise || allowedEmailDomains.length === 0) return true
    const domain = (email.split('@')[1] || '').trim().toLowerCase()
    return allowedEmailDomains.includes(domain)
  }
} as const
