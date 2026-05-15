import type { PipelineStatus } from '../constants/pipeline-status'
import type { FirestoreTimestampLike } from './user'

export type PipelineDoc = {
  userId: string
  managerUid?: string | null
  companyId?: string | null
  companyName: string
  companySector?: string
  companyCity?: string
  companyPhone?: string
  companyEmail?: string
  assignedTo?: string | null
  memberName?: string | null      // Nom du membre qui a ajouté/est assigné
  memberAccessId?: string | null  // Access ID du membre (ex: "prenomnom@entreprise")
  assignedByName?: string | null  // Nom du manager qui a fait l'assignation
  previousAssignees?: {
    userId: string
    memberName: string
    assignedAt: string
  }[]
  status: PipelineStatus
  note?: string
  notes?: string
  nextAction?: string
  nextDate?: string | null
  nextFollowUp?: string | null
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}