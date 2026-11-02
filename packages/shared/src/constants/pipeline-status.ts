export const pipelineStatuses = ['prospection', 'negociation', 'conclue', 'perdue'] as const
export type PipelineStatus = (typeof pipelineStatuses)[number]

/** Motifs d'échec / perte normalisés pour l'intelligence Win/Loss */
export const LOSS_REASONS = [
  { id: 'price_too_high', labelFr: 'Prix trop élevé / Hors budget', labelEn: 'Price too high / Over budget' },
  { id: 'competitor_chosen', labelFr: 'Concurrent choisi', labelEn: 'Competitor chosen' },
  { id: 'project_canceled', labelFr: 'Projet ou besoin annulé / gelé', labelEn: 'Project canceled / frozen' },
  { id: 'unreachable', labelFr: 'Prospect injoignable / Sans réponse', labelEn: 'Unreachable / Ghosted' },
  { id: 'features_missing', labelFr: 'Offre inadaptée aux besoins', labelEn: 'Product / Service unfit' },
  { id: 'other', labelFr: 'Autre motif', labelEn: 'Other reason' }
] as const

export type LossReasonId = (typeof LOSS_REASONS)[number]['id']

