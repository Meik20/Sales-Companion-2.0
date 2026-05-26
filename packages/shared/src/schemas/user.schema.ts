import { z } from 'zod'
import { plans } from '../constants/plans'
import { roles } from '../constants/roles'

export const userSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(roles),
  companyId: z.string().nullable(),
  managerUid: z.string().nullable().optional(),
  teamAccessId: z.string().nullable().optional(),
  plan: z.enum(plans),
  dailyLimit: z.number().int().nonnegative(),
  dailyUsed: z.number().int().nonnegative(),
  active: z.boolean(),
  createdAt: z.unknown(),
  updatedAt: z.unknown()
})
