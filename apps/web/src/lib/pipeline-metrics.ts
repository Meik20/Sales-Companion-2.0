/**
 * apps/web/src/lib/pipeline-metrics.ts
 *
 * Source de Vérité Unique (SSOT) des règles de calcul de performance,
 * de pipeline et de consolidation des objectifs de segment de Sales Companion 2.0.
 *
 * RÈGLE ARCHITECTURALE ABSOLUE (AGENTS.md) :
 * 1. Portefeuille Actif = Opportunités en cours de traitement ('prospection' + 'negociation').
 *    Les opportunités 'conclue' sont clôturées et ne font JAMAIS partie du portefeuille actif en cours.
 * 2. Valeur du Pipeline Actif = Somme des montants des opportunités actives ('prospection' + 'negociation').
 * 3. Consolidation Segment = Seuls les Team Managers opérationnels portent des objectifs consolidés.
 *    Le Senior Manager supervise l'organisation et ne gère pas de portefeuille opérationnel de routine ;
 *    ses cibles résiduelles sont formellement exclues des quotas consolidés du segment.
 */

export type CanonicalPipelineStatus = 'prospection' | 'negociation' | 'conclue' | 'other'

const PROSPECTION_STATUSES = new Set([
  'prospection',
  'prospect',
  'to_contact',
  'contact',
  'nouveau',
  'lead'
])

const NEGOCIATION_STATUSES = new Set([
  'negociation',
  'negotiation',
  'in_progress',
  'en_cours'
])

const CONCLUE_STATUSES = new Set([
  'conclue',
  'conclusion',
  'won',
  'closed',
  'gagne',
  'signe'
])

/**
 * Normalise un statut pipeline vers les 3 statuts canoniques du CRM.
 */
export function normalizePipelineStatus(rawStatus: unknown): CanonicalPipelineStatus {
  const st = String(rawStatus ?? '')
    .toLowerCase()
    .trim()
  if (PROSPECTION_STATUSES.has(st)) return 'prospection'
  if (NEGOCIATION_STATUSES.has(st)) return 'negociation'
  if (CONCLUE_STATUSES.has(st)) return 'conclue'
  return 'other'
}

/**
 * Indique si une opportunité est active (en cours de travail : prospection ou négociation).
 */
export function isPipelineActive(rawStatus: unknown): boolean {
  const status = normalizePipelineStatus(rawStatus)
  return status === 'prospection' || status === 'negociation'
}

export interface PipelineItemLike {
  status?: unknown
  amount?: unknown
  [key: string]: unknown
}

export interface PipelineStatsSummary {
  /** Nombre total d'affaires dans le scope (actives + conclues) */
  totalCount: number
  /** Nombre d'opportunités actives en cours (prospection + négociation) */
  activeCount: number
  /** Montant total des opportunités actives (prospection + négociation) */
  activePipelineAmount: number
  /** Opportunités en phase initiale */
  prospectionCount: number
  prospectionAmount: number
  /** Opportunités en négociation */
  negociationCount: number
  negociationAmount: number
  /** Opportunités gagnées / contrats signés */
  conclueCount: number
  /** Chiffre d'affaires conclu / encaissé */
  concludedAmount: number
  /** Taux de conversion global en % (conclues / total) */
  conversionRate: number
}

/**
 * Calcule l'intégralité des indicateurs d'un portefeuille d'opportunités.
 */
export function calculatePipelineStats(items: PipelineItemLike[]): PipelineStatsSummary {
  let prospectionCount = 0
  let prospectionAmount = 0
  let negociationCount = 0
  let negociationAmount = 0
  let conclueCount = 0
  let concludedAmount = 0

  for (const item of items) {
    const status = normalizePipelineStatus(item.status)
    const amount = typeof item.amount === 'number' ? item.amount : Number(item.amount) || 0

    if (status === 'prospection') {
      prospectionCount++
      prospectionAmount += amount
    } else if (status === 'negociation') {
      negociationCount++
      negociationAmount += amount
    } else if (status === 'conclue') {
      conclueCount++
      concludedAmount += amount
    }
  }

  const totalCount = items.length
  const activeCount = prospectionCount + negociationCount
  const activePipelineAmount = prospectionAmount + negociationAmount
  const conversionRate = totalCount > 0 ? Math.round((conclueCount / totalCount) * 100) : 0

  return {
    totalCount,
    activeCount,
    activePipelineAmount,
    prospectionCount,
    prospectionAmount,
    negociationCount,
    negociationAmount,
    conclueCount,
    concludedAmount,
    conversionRate
  }
}

/**
 * Calcule le taux d'atteinte en pourcentage arrondi, ou null si l'objectif n'est pas défini.
 */
export function calculateAttainmentRate(
  realized: number,
  target: number | null | undefined
): number | null {
  if (target == null || target <= 0) return null
  return Math.round((realized / target) * 100)
}

/**
 * Calcule le taux Réalisé / Objectif (R/O) consolidé.
 * Fait la moyenne entre le taux volume et le taux valeur s'ils sont disponibles.
 */
export function calculateRoRate(
  volumeAttainmentRate: number | null | undefined,
  valueAttainmentRate: number | null | undefined,
  fallbackConversionRate: number = 0
): number {
  const hasVol = volumeAttainmentRate != null
  const hasVal = valueAttainmentRate != null

  if (hasVol && hasVal) {
    return Math.round(((volumeAttainmentRate as number) + (valueAttainmentRate as number)) / 2)
  }
  if (hasVol) return volumeAttainmentRate as number
  if (hasVal) return valueAttainmentRate as number
  return fallbackConversionRate
}

export interface TargetEntryLike {
  managerUid?: string
  memberId?: string
  targetVolume?: number | null
  targetValue?: number | null
  period?: string | null
}

export interface ManagerEntryLike {
  uid: string
  isSenior?: boolean
  orgRole?: string
}

export interface ConsolidatedTargetsResult {
  targetVolume: number | null
  targetValue: number | null
  period: string | null
  teamManagersCount: number
}

/**
 * Consolide les objectifs au niveau Organisation / Segment.
 * APPLIQUE FORMELLEMENT LA RÈGLE INVIOLABLE :
 * Les objectifs du Senior Manager sont exclus de la consolidation segment.
 * Seuls les Team Managers opérationnels sont additionnés.
 */
export function aggregateOrgSegmentTargets(
  managers: ManagerEntryLike[],
  targets: TargetEntryLike[]
): ConsolidatedTargetsResult {
  const teamManagerUids = new Set(
    managers
      .filter((m) => !m.isSenior && m.orgRole !== 'senior_manager')
      .map((m) => m.uid)
  )

  const relevantTargets = targets.filter(
    (t) => t.managerUid && teamManagerUids.has(t.managerUid)
  )

  const targetVolume = relevantTargets.reduce(
    (sum, t) => (typeof t.targetVolume === 'number' && t.targetVolume > 0 ? sum + t.targetVolume : sum),
    0
  )

  const targetValue = relevantTargets.reduce(
    (sum, t) => (typeof t.targetValue === 'number' && t.targetValue > 0 ? sum + t.targetValue : sum),
    0
  )

  const period = relevantTargets.find((t) => Boolean(t.period))?.period ?? null

  return {
    targetVolume: targetVolume > 0 ? targetVolume : null,
    targetValue: targetValue > 0 ? targetValue : null,
    period,
    teamManagersCount: teamManagerUids.size
  }
}
