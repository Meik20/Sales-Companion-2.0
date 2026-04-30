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
  status: PipelineStatus
  note?: string
  nextAction?: string
  nextDate?: string | null
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}