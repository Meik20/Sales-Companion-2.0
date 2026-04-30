import type { SupportStatus } from '../constants/support-status'
import type { FirestoreTimestampLike } from './user'

export type SupportThreadType = 'chat' | 'ticket'
export type SupportPriority = 'low' | 'normal' | 'high'

export type SupportThreadDoc = {
  userId: string
  userEmail: string
  userName: string
  subject: string
  type: SupportThreadType
  status: SupportStatus
  priority?: SupportPriority
  assignedAdminUid?: string | null
  lastMessage: string
  unreadByUser: boolean
  unreadByAdmin: boolean
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}

export type SupportMessageDoc = {
  senderId: string
  senderRole: 'user' | 'admin'
  content: string
  createdAt: FirestoreTimestampLike
}