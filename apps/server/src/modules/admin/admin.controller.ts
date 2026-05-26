import type { Request, Response } from 'express'
import { z } from 'zod'
import { adminService } from './admin.service'
import { companiesService } from '../companies/companies.service'

const initAdminSchema = z.object({
  uid: z.string().min(1)
})

const updateUserSchema = z.object({
  role: z.string().optional(),
  active: z.boolean().optional(),
  plan: z.string().optional(),
  dailyLimit: z.number().optional(),
  dailyUsed: z.number().optional()
})

export const adminController = {
  async getStats(_req: Request, res: Response) {
    const result = await adminService.getStats()
    return res.json(result)
  },

  async initAdmin(req: Request, res: Response) {
    const input = initAdminSchema.parse(req.body)
    const result = await adminService.setAdminClaim(input.uid)
    return res.status(201).json(result)
  },

  async listUsers(_req: Request, res: Response) {
    const items = await adminService.listUsers()
    return res.json({ items })
  },

  async updateUser(req: Request, res: Response) {
    const data = updateUserSchema.parse(req.body)
    const result = await adminService.updateUser({
      uid: req.params.uid as string,
      data
    })
    return res.json(result)
  },

  async deleteUser(req: Request, res: Response) {
    const result = await adminService.deleteUser(req.params.uid as string)
    return res.json(result)
  },

  async getCompanies(req: Request, res: Response) {
    const page = req.query.page ? parseInt(req.query.page as string) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20

    const result = await companiesService.listPaginated(page, pageSize)
    return res.json(result)
  }
}
