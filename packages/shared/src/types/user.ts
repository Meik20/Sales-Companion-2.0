import type { UserPlan } from '../constants/plans'
import type { UserRole } from '../constants/roles'

export type FirestoreTimestampLike = unknown

export type UserDoc = {
  uid: string
  email: string
  name: string
  role: UserRole
  companyId: string | null
  managerUid?: string | null
  teamAccessId?: string | null
  sector?: string | null
  plan: UserPlan
  dailyLimit: number
  dailyUsed: number
  active: boolean
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}
