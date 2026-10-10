import type { FirestoreTimestampLike } from './user'

export type ClientDoc = {
  id?: string
  companyName: string
  companySector?: string
  companyCity?: string
  companyPhone?: string
  companyEmail?: string
  contactName?: string
  address?: string
  country?: string
  amount?: number | null
  currency?: string | null
  notes?: string
  status?: string

  // Attribution au membre de l'équipe ayant conclu la vente
  assignedTo?: string | null
  assignedName?: string | null
  assignedEmail?: string | null
  assignedRole?: string | null

  // Rattachement hiérarchique
  managerUid: string
  orgCode?: string | null

  // Traçabilité pipeline d'origine
  pipelineItemId?: string | null
  concludedAt: FirestoreTimestampLike
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike

  // Découplage de visibilité pour les agents support
  dismissedBySupportAgents?: string[]
}
