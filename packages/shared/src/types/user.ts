import type { UserPlan } from '../constants/plans'
import type { UserRole } from '../constants/roles'

export type FirestoreTimestampLike = unknown

export type UserDoc = {
  uid: string
  email: string
  name: string
  role: UserRole
  country?: string | null   // Code ISO 3166-1 alpha-2 ex: "CM", "SN", "TD", "CF"
  companyId?: string | null
  company?: string | null
  companyName?: string | null
  sector?: string | null
  region?: string | null
  phone?: string | null
  city?: string | null
  managerUid?: string | null
  teamAccessId?: string | null
  plan: UserPlan
  dailyLimit: number
  dailyUsed: number
  active: boolean
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}
