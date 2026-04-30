import type { FirestoreTimestampLike } from './user'

export type SavedSearchDoc = {
  userId: string
  title: string
  query: string
  filters: Record<string, unknown>
  resultsPreview?: Array<{
    companyId?: string
    name: string
  }>
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}