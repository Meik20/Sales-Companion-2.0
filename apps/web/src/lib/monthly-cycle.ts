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

