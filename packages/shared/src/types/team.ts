import type { FirestoreTimestampLike } from './user'

export type TeamAccessDoc = {
  accessId: string
  accessLabel: string
  firstname: string
  lastname: string
  company: string
  companyId?: string | null
  role: 'member'
  status: 'pending' | 'active' | 'revoked'
  activated: boolean
  firebaseUid: string | null
  email: string | null
  createdBy: string
  managerUid: string
  managerEmail: string
  mustChangePassword: boolean
  createdAt: FirestoreTimestampLike
  activatedAt?: FirestoreTimestampLike | null
  revokedAt?: FirestoreTimestampLike | null
}
