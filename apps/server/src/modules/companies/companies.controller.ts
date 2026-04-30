import type { Request, Response } from 'express'
import { companiesService } from './companies.service'

export const companiesController = {
  async list(req: Request, res: Response) {
    const page = req.query.page ? parseInt(req.query.page as string) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20

    // Check if pagination params are provided
    if (req.query.page || req.query.pageSize) {
      const result = await companiesService.listPaginated(page, pageSize)
      return res.json(result)
    }

    // Fallback to non-paginated response for backward compatibility
    return res.json({ items: await companiesService.list() })
  },

  async deleteOne(req: Request, res: Response) {
    return res.json(await companiesService.deleteOne(req.params.id))
  },

  async deleteAll(_req: Request, res: Response) {
    return res.json(await companiesService.deleteAll())
  }
}