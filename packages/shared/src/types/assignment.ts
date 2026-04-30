import type { FirestoreTimestampLike } from './user'

export type AssignmentDoc = {
  managerUid: string
  managerName?: string
  assigneeId: string
  assigneeUid?: string
  prospectIds: string[]
  note?: string
  status: 'pending' | 'in_pipeline' | 'done'
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}