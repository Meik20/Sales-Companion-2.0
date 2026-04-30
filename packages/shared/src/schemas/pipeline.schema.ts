import { z } from 'zod'
import { pipelineStatuses } from '../constants/pipeline-status'

export const pipelineSchema = z.object({
  userId: z.string().min(1),
  managerUid: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  companyName: z.string().min(1),
  companySector: z.string().optional(),
  companyCity: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().optional(),
  assignedTo: z.string().nullable().optional(),
  status: z.enum(pipelineStatuses),
  note: z.string().optional(),
  nextAction: z.string().optional(),
  nextDate: z.string().nullable().optional(),
  createdAt: z.unknown(),
  updatedAt: z.unknown()
})