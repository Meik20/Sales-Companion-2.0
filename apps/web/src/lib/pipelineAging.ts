/**
 * pipelineAging.ts
 * Utilitaire de suivi de vélocité commerciale et d'alerte de durée dans le pipeline.
 * Analyse le parcours de vente et alerte selon le temps passé dans chaque étape.
 */

export type PipelineStage = 'prospection' | 'negociation' | 'conclue'

export type AgingAlertLevel =
  | 'fresh'     // 🟢 Récent / dans les temps
  | 'warning'   // 🟡 Attention / délai qui s'allonge
  | 'alert'     // 🔴 Alerte / stagnation critique
  | 'concluded' // 🔵/🟢 Vente conclue avec succès

export type PipelineAgingInfo = {
  daysInPipeline: number
  enteredDateFormatted: string
  relativeTimeFormatted: string
  level: AgingAlertLevel
  stage: PipelineStage
  badgeText: string
  color: string
  bgColor: string
  borderColor: string
  warningMessage?: string
  isConclue: boolean
}

/**
 * Seuils en jours par étape du parcours de vente
 */
export const PIPELINE_STAGE_THRESHOLDS = {
  prospection: {
    warning: 7,   // À partir de 8 jours: avertissement
    alert: 14,    // Plus de 14 jours: alerte critique de stagnation
  },
  negociation: {
    warning: 14,  // À partir de 15 jours: attention relance
    alert: 30,    // Plus de 30 jours: risque d'abandon / closing critique
  },
} as const

/**
 * Normalise le statut vers les 3 grandes étapes canoniques
 */
export function normalizePipelineStatus(rawStatus?: string | null): PipelineStage {
  const s = String(rawStatus || '').toLowerCase().trim()
  if (['conclue', 'conclusion', 'closed', 'won'].includes(s)) return 'conclue'
  if (['negociation', 'negotiation', 'nego'].includes(s)) return 'negociation'
  return 'prospection'
}

/**
 * Calcule l'ancienneté d'un prospect dans le pipeline et son niveau d'alerte.
 * @param createdAt - Date ISO ou timestamp de création/entrée
 * @param rawStatus - Statut courant (prospection, négociation, conclue)
 * @param assignedAt - Date ISO éventuelle d'assignation
 * @param updatedAt - Date ISO éventuelle de dernière mise à jour
 */
export function getPipelineAging(
  createdAt?: string | null | Date,
  rawStatus?: string | null,
  assignedAt?: string | null | Date,
  updatedAt?: string | null | Date
): PipelineAgingInfo {
  const stage = normalizePipelineStatus(rawStatus)
  const isConclue = stage === 'conclue'

  // Date de référence : date d'assignation prioritaire si existante, sinon createdAt
  const refDateStr = assignedAt || createdAt
  const refDate = refDateStr ? new Date(refDateStr) : new Date()

  // Formatage de la date d'entrée
  const enteredDateFormatted = !isNaN(refDate.getTime())
    ? refDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '—'

  // Calcul du nombre de jours écoulés
  const now = Date.now()
  const diffMs = Math.max(0, now - (isNaN(refDate.getTime()) ? now : refDate.getTime()))
  const daysInPipeline = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Libellé relatif : "Aujourd'hui", "Hier", "Il y a X jours"
  let relativeTimeFormatted = 'Aujourd’hui'
  if (daysInPipeline === 1) {
    relativeTimeFormatted = 'Hier'
  } else if (daysInPipeline > 1) {
    relativeTimeFormatted = `Il y a ${daysInPipeline} jours`
  }

  // Si la vente est déjà conclue : fin des alertes
  if (isConclue) {
    // Calcul de la durée jusqu'à la conclusion si updatedAt existe
    let concludedDays = daysInPipeline
    if (updatedAt) {
      const upDate = new Date(updatedAt)
      if (!isNaN(upDate.getTime()) && !isNaN(refDate.getTime())) {
        concludedDays = Math.max(0, Math.floor((upDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)))
      }
    }

    return {
      daysInPipeline,
      enteredDateFormatted,
      relativeTimeFormatted,
      level: 'concluded',
      stage,
      badgeText: concludedDays === 0 ? 'Conclue le jour même' : `Conclue en ${concludedDays}j`,
      color: 'var(--pipeline-concluded-color, #047857)',
      bgColor: 'var(--pipeline-concluded-bg, #ecfdf5)',
      borderColor: 'var(--pipeline-concluded-border, rgba(5, 150, 105, 0.25))',
      warningMessage: undefined,
      isConclue: true
    }
  }

  // Étape : Prospection
  if (stage === 'prospection') {
    const { warning, alert } = PIPELINE_STAGE_THRESHOLDS.prospection

    if (daysInPipeline > alert) {
      return {
        daysInPipeline,
        enteredDateFormatted,
        relativeTimeFormatted,
        level: 'alert',
        stage,
        badgeText: `${daysInPipeline}j · Stagnation`,
        color: 'var(--pipeline-alert-color, #b91c1c)',
        bgColor: 'var(--pipeline-alert-bg, #fef2f2)',
        borderColor: 'var(--pipeline-alert-border, rgba(185, 28, 28, 0.25))',
        warningMessage: `Ce prospect est en phase de prospection depuis plus de ${alert} jours sans progression. Contactez-le rapidement ou mettez à jour son statut.`,
        isConclue: false
      }
    }

    if (daysInPipeline > warning) {
      return {
        daysInPipeline,
        enteredDateFormatted,
        relativeTimeFormatted,
        level: 'warning',
        stage,
        badgeText: `${daysInPipeline}j · À relancer`,
        color: 'var(--pipeline-warning-color, #b45309)',
        bgColor: 'var(--pipeline-warning-bg, #fffbeb)',
        borderColor: 'var(--pipeline-warning-border, rgba(180, 83, 9, 0.25))',
        warningMessage: `Prospect en prospection depuis ${daysInPipeline} jours. Une relance commerciale est conseillée pour faire avancer le dossier.`,
        isConclue: false
      }
    }

    return {
      daysInPipeline,
      enteredDateFormatted,
      relativeTimeFormatted,
      level: 'fresh',
      stage,
      badgeText: daysInPipeline === 0 ? 'Nouveau (aujourd’hui)' : `${daysInPipeline}j dans le pipeline`,
      color: 'var(--pipeline-fresh-color, #047857)',
      bgColor: 'var(--pipeline-fresh-bg, #ecfdf5)',
      borderColor: 'var(--pipeline-fresh-border, rgba(5, 150, 105, 0.25))',
      isConclue: false
    }
  }

  // Étape : Négociation
  const { warning, alert } = PIPELINE_STAGE_THRESHOLDS.negociation

  if (daysInPipeline > alert) {
    return {
      daysInPipeline,
      enteredDateFormatted,
      relativeTimeFormatted,
      level: 'alert',
      stage,
      badgeText: `${daysInPipeline}j · Négociation critique`,
      color: 'var(--pipeline-alert-color, #b91c1c)',
      bgColor: 'var(--pipeline-alert-bg, #fef2f2)',
      borderColor: 'var(--pipeline-alert-border, rgba(185, 28, 28, 0.25))',
      warningMessage: `Négociation ouverte depuis plus de ${alert} jours. Risque d'abandon : prévoyez un point de clôture ou un closing rapide.`,
      isConclue: false
    }
  }

  if (daysInPipeline > warning) {
    return {
      daysInPipeline,
      enteredDateFormatted,
      relativeTimeFormatted,
      level: 'warning',
      stage,
      badgeText: `${daysInPipeline}j · Négociation longue`,
      color: 'var(--pipeline-warning-color, #b45309)',
      bgColor: 'var(--pipeline-warning-bg, #fffbeb)',
      borderColor: 'var(--pipeline-warning-border, rgba(180, 83, 9, 0.25))',
      warningMessage: `Négociation en cours depuis ${daysInPipeline} jours. Une offre finale ou une relance décisionnaire est recommandée.`,
      isConclue: false
    }
  }

  return {
    daysInPipeline,
    enteredDateFormatted,
    relativeTimeFormatted,
    level: 'fresh',
    stage,
    badgeText: `${daysInPipeline}j · En négociation`,
    color: 'var(--pipeline-progress-color, #1d4ed8)',
    bgColor: 'var(--pipeline-progress-bg, #eff6ff)',
    borderColor: 'var(--pipeline-progress-border, rgba(29, 78, 216, 0.2))',
    isConclue: false
  }
}
