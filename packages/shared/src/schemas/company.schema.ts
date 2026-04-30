import { z } from 'zod'

export const companySchema = z.object({
  id: z.string().min(1),
  raisonSociale: z.string().min(1),
  sigle: z.string().optional(),
  niu: z.string().nullable().optional(),
  activitePrincipale: z.string().optional(),
  sector: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().optional(),
  dirigeant: z.string().optional(),
  rccm: z.string().optional(),
  active: z.boolean(),
  sourceFile: z.string().optional(),
  createdAt: z.unknown(),
  updatedAt: z.unknown()
})