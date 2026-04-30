import { z } from 'zod'

export const teamAccessSchema = z.object({
  accessId: z.string().min(1),
  accessLabel: z.string().min(3),
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  company: z.string().min(1),
  companyId: z.string().nullable().optional(),
  role: z.literal('member'),
  status: z.enum(['pending', 'active', 'revoked']),
  activated: z.boolean(),
  firebaseUid: z.string().nullable(),
  email: z.string().email().nullable(),
  createdBy: z.string().min(1),
  managerUid: z.string().min(1),
  managerEmail: z.string().email(),
  mustChangePassword: z.boolean(),
  createdAt: z.unknown(),
  activatedAt: z.unknown().nullable().optional(),
  revokedAt: z.unknown().nullable().optional()
})