import { COUNTRY_TIMEZONES, type CountryCode } from '@sales-companion/shared'

/**
 * monthly-cycle.ts
 * Gestion du cycle de vie mensuel des pipelines et tableaux de bord.
 *
 * Règle métier :
 * - Le cycle de vente est mensuel (du 1er au dernier jour du mois).
 * - Clôture automatique à J+3 : Les opportunités conclues au cours du mois M-1 restent
 *   actives et modifiables dans le pipeline jusqu'au 3e jour du mois M à 23:59:59.
 * - Le 3e jour du mois M à 23:59:59 (ou dès le 4e jour à 00:00:00), les opportunités
 *   conclues sont automatiquement archivées dans la base de données "clients" et
 *   retirées du pipeline opérationnel.
 * - Les opportunités en cours ('prospection', 'negociation') restent dans le pipeline
 *   et sont automatiquement reconduites pour le nouveau mois.
 */

/**
 * Résout le fuseau horaire officiel pour un pays donné (par défaut Africa/Douala).
 */
export function getOrgTimezone(countryCode?: string | null): string {
  if (countryCode && typeof COUNTRY_TIMEZONES === 'object' && COUNTRY_TIMEZONES !== null && countryCode.toUpperCase() in COUNTRY_TIMEZONES) {
    return COUNTRY_TIMEZONES[countryCode.toUpperCase() as CountryCode]
  }
  return 'Africa/Douala' // Timezone par défaut du siège (GMT+1)
}

/**
 * Retourne la période YYYY-MM active selon le fuseau horaire de l'organisation.
 * Empêche le décalage UTC au changement de mois.
 */
export function getOrgMonthPeriod(countryCode?: string | null, now = new Date()): string {
  const timeZone = getOrgTimezone(countryCode)
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit'
    })
    return formatter.format(now) // Format strict: "YYYY-MM"
  } catch {
    return now.toISOString().slice(0, 7)
  }
}

export interface MonthPeriodInfo {
  key: string // e.g. "2026-10"
  labelFr: string // e.g. "Octobre 2026"
  labelEn: string // e.g. "October 2026"
  year: number
  month: number // 1-12
  startDate: Date
  endDate: Date
  graceCutoffDate: Date // 3rd of month + 1 at 23:59:59.999
  isGracePeriod: boolean // true if today is between 1st and 3rd of month + 1
  isClosed: boolean // true if now > graceCutoffDate
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const SHORT_MONTHS_FR = [
  'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
]

const SHORT_MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

/**
 * Formate une période mensuelle (ex: "2026-11") en format compact lisible (ex: "Nov 2026").
 * Permet d'optimiser l'espace visuel dans les sélecteurs et cartes sans tronquer les libellés.
 */
export function formatShortMonthPeriod(periodKey?: string | null, lang: string = 'fr'): string {
  if (!periodKey) return ''
  const parts = periodKey.split('-').map(Number)
  if (!parts[0] || !parts[1]) return periodKey
  const year = parts[0]
  const monthIdx = parts[1] - 1
  if (monthIdx < 0 || monthIdx > 11) return periodKey
  const monthList = lang === 'en' ? SHORT_MONTHS_EN : SHORT_MONTHS_FR
  return `${monthList[monthIdx]} ${year}`
}

/**
 * Retourne les détails du cycle mensuel pour une date donnée.
 */
export function getMonthPeriodInfo(year: number, month1Indexed: number, now = new Date()): MonthPeriodInfo {
  const monthIdx = month1Indexed - 1
  const startDate = new Date(year, monthIdx, 1, 0, 0, 0, 0)
  // Dernier jour du mois à 23:59:59.999
  const endDate = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999)
  // J+3 après la fin du mois = le 3 du mois suivant à 23:59:59.999
  const graceCutoffDate = new Date(year, monthIdx + 1, 3, 23, 59, 59, 999)

  const isClosed = now.getTime() > graceCutoffDate.getTime()
  // En période de grâce si le mois est terminé (now > endDate) mais pas encore dépassé J+3
  const isGracePeriod = now.getTime() > endDate.getTime() && now.getTime() <= graceCutoffDate.getTime()

  const padMonth = String(month1Indexed).padStart(2, '0')
  const key = `${year}-${padMonth}`

  return {
    key,
    labelFr: `${MONTHS_FR[monthIdx]} ${year}`,
    labelEn: `${MONTHS_EN[monthIdx]} ${year}`,
    year,
    month: month1Indexed,
    startDate,
    endDate,
    graceCutoffDate,
    isGracePeriod,
    isClosed
  }
}

/**
 * Retourne la liste des N derniers mois historiques disponibles pour les réunions de bilan (ex: M, M-1, M-2...).
 * Ancré sur le fuseau horaire de l'organisation pour éliminer tout décalage temporel.
 */
export function getAvailableMonthPeriods(
  count = 6,
  countryCode?: string | null,
  now = new Date()
): MonthPeriodInfo[] {
  const timeZone = getOrgTimezone(countryCode)
  let currentYear = now.getFullYear()
  let currentMonth = now.getMonth() + 1
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric'
    }).formatToParts(now)
    for (const p of parts) {
      if (p.type === 'year') currentYear = Number(p.value)
      if (p.type === 'month') currentMonth = Number(p.value)
    }
  } catch {
    // fallback
  }

  const periods: MonthPeriodInfo[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1)
    periods.push(getMonthPeriodInfo(d.getFullYear(), d.getMonth() + 1, now))
  }
  return periods
}

/**
 * Retourne le libellé localisé d'une période mensuelle selon la langue active.
 */
export function getMonthPeriodLabel(
  period?: { labelFr?: string; labelEn?: string } | null,
  lang: string = 'fr'
): string {
  if (!period) return lang === 'en' ? 'Current' : 'En cours'
  return lang === 'en'
    ? (period.labelEn || period.labelFr || 'Current')
    : (period.labelFr || period.labelEn || 'En cours')
}

/**
 * Retourne la période active par défaut selon la date courante et la règle J+3 :
 * Si nous sommes entre le 1er et le 3 du mois M :
 * - Le mois M-1 est encore en période de grâce (clôture en cours).
 * - L'utilisateur peut consulter M-1 ou basculer sur M.
 */
export function getCurrentCycleContext(now = new Date()) {
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12
  const dayOfMonth = now.getDate()

  const isWithinJ3GracePeriod = dayOfMonth <= 3

  // Mois M-1
  const prevDate = new Date(currentYear, currentMonth - 2, 1)
  const prevPeriod = getMonthPeriodInfo(prevDate.getFullYear(), prevDate.getMonth() + 1, now)

  // Mois M (courant)
  const currentPeriod = getMonthPeriodInfo(currentYear, currentMonth, now)

  // Si on est dans les 3 premiers jours, la période de réconciliation par défaut est M-1
  const defaultPeriodKey = isWithinJ3GracePeriod ? prevPeriod.key : currentPeriod.key

  // Générer la liste des 6 derniers mois pour les sélecteurs
  const availablePeriods: MonthPeriodInfo[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1)
    availablePeriods.push(getMonthPeriodInfo(d.getFullYear(), d.getMonth() + 1, now))
  }

  return {
    currentPeriod,
    prevPeriod,
    isWithinJ3GracePeriod,
    defaultPeriodKey,
    availablePeriods
  }
}

/**
 * Vérifie si une opportunité conclue est éligible au transfert automatique vers clients.
 * Règle : 3 jours après la fin du mois de conclusion à 23:59:59.999.
 */
export function isEligibleForAutoArchive(concludedDate: Date, now = new Date()): boolean {
  const year = concludedDate.getFullYear()
  const month = concludedDate.getMonth() // 0-11
  const cutoff = new Date(year, month + 1, 3, 23, 59, 59, 999)
  return now.getTime() >= cutoff.getTime()
}

/**
 * Calcule la date limite maximale d'éligibilité pour l'archivage J+3.
 * Toute opportunité conclue STRICTEMENT AVANT cette date est éligible au transfert vers clients.
 *
 * Règle :
 * - Si now est entre le 1er et le 3 du mois (day <= 3) : le mois M-1 est encore en période de grâce.
 *   Seules les affaires conclues au cours de M-2 ou avant (strictement avant le 1er du mois M-1) sont éligibles.
 * - Si now est le 4 du mois ou après (day >= 4) : la période de grâce de M-1 a pris fin le 3 à 23:59:59.
 *   Toutes les affaires conclues au cours de M-1 ou avant (strictement avant le 1er du mois M) sont éligibles.
 */
export function getMaxEligibleConcludedDate(now = new Date()): Date {
  const year = now.getFullYear()
  const month = now.getMonth() // 0-11
  const day = now.getDate()

  if (day <= 3) {
    // Période de grâce M-1 active : éligible seulement si conclu au mois M-2 ou plus ancien
    return new Date(year, month - 1, 1, 0, 0, 0, 0)
  } else {
    // Période de grâce M-1 échue : éligible si conclu au mois M-1 ou plus ancien
    return new Date(year, month, 1, 0, 0, 0, 0)
  }
}

/**
 * Vérifie si la période d'un objectif est échue par rapport à une date de référence (now).
 * Règle métier : Les objectifs mensuels sont réinitialisés et mis à 00 tous les derniers jours du mois M à 23:59:59.
 */
export function isTargetPeriodExpired(periodStr?: string | null, now = new Date()): boolean {
  if (!periodStr) return false
  const match = periodStr.match(/^(\d{4})-(\d{2})$/)
  if (!match || !match[1] || !match[2]) return false
  const year = parseInt(match[1], 10)
  const month1Indexed = parseInt(match[2], 10)
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1
  if (nowYear > year) return true
  if (nowYear < year) return false
  return nowMonth > month1Indexed
}

/**
 * Vérifie si une opportunité conclue est en attente de migration vers la base clients (période de grâce J+3).
 * Règle d'or : Dès le 1er du nouveau mois M, les deals conclus en M-1 reçoivent un marqueur spécifique
 * en attente de leur archivage automatique au 3e jour du mois à 23:59:59.
 */
export function isPendingMigrationDeal(
  item: {
    status?: string | null
    pendingMigration?: boolean | null
    concludedAt?: any
    updatedAt?: any
    createdAt?: any
  },
  now = new Date()
): boolean {
  // Passé le 3e jour du mois (période de grâce J+3 échue), le marqueur n'est plus actif
  if (now.getDate() > 3) return false
  if (item.pendingMigration === true) return true
  const st = (item.status || '').toLowerCase().trim()
  if (!['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(st)) return false

  let date: Date | null = null
  if (item.concludedAt) {
    date = item.concludedAt.toDate ? item.concludedAt.toDate() : new Date(item.concludedAt)
  } else if (item.updatedAt) {
    date = item.updatedAt.toDate ? item.updatedAt.toDate() : new Date(item.updatedAt)
  } else if (item.createdAt) {
    date = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt)
  }
  if (!date || isNaN(date.getTime())) return false

  // Conclu strictement avant le 1er jour du mois courant = affaire conclue en M-1 ou avant
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  return date < startOfCurrentMonth
}



