import type { FirestoreTimestampLike } from './user'

export type CompanyDoc = {
  id: string
  raisonSociale: string
  sigle?: string
  niu?: string | null
  activitePrincipale?: string
  sector?: string
  region?: string
  city?: string
  address?: string
  telephone?: string
  email?: string
  website?: string
  dirigeant?: string
  rccm?: string
  active: boolean
  sourceFile?: string
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}
