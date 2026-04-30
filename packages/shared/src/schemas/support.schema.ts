import { z } from 'zod'
import { supportStatuses } from '../constants/support-status'

export const supportThreadSchema = z.object({
  userId: z.string().min(1),
  userEmail: z.string().email(),
  userName: z.string().min(1),
  subject: z.string().min(1),
  type: z.enum(['chat', 'ticket']),
  status: z.enum(supportStatuses),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  assignedAdminUid: z.string().nullable().optional(),
  lastMessage: z.string().min(1),
  unreadByUser: z.boolean(),
  unreadByAdmin: z.boolean(),
  createdAt: z.unknown(),
  updatedAt: z.unknown()
})

export const supportMessageSchema = z.object({
  senderId: z.string().min(1),
  senderRole: z.enum(['user', 'admin']),
  content: z.string().min(1),
  createdAt: z.unknown()
})