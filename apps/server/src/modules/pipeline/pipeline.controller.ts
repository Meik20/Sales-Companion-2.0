import type { Response } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../types/express'
import { pipelineService } from './pipeline.service'

const createPipelineItemSchema = z.object({
  companyId: z.string().min(1),
  companyName: z.string().min(1),
  companySector: z.string().optional(),
  companyCity: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email().optional(),
  status: z.enum(['prospection', 'negotiation', 'conclusion', 'lost']).default('prospection'),
  notes: z.string().optional(),
  nextFollowUp: z.string().optional(),
  managerUid: z.string().nullable().optional(),
})

const updatePipelineItemSchema = z.object({
  status: z.enum(['prospection', 'negotiation', 'conclusion', 'lost']).optional(),
  notes: z.string().optional(),
  nextFollowUp: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email().optional(),
})

export const pipelineController = {
  async list(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const items = await pipelineService.listUserPipeline(req.auth.uid)
      return res.json(items)
    } catch (error) {
      return res.status(500).json({ message: 'Erreur lors de la récupération du pipeline' })
    }
  },

  async get(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const item = await pipelineService.getPipelineItem(req.params.id, req.auth.uid)
      return res.json(item)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur'
      const statusCode = message === 'Unauthorized' ? 403 : 404
      return res.status(statusCode).json({ message })
    }
  },

  async create(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const input = createPipelineItemSchema.parse(req.body)
      const item = await pipelineService.createPipelineItem({
        userId: req.auth.uid,
        managerUid: input.managerUid,
        companyId: input.companyId,
        companyName: input.companyName,
        companySector: input.companySector,
        companyCity: input.companyCity,
        companyPhone: input.companyPhone,
        companyEmail: input.companyEmail,
        status: input.status,
        notes: input.notes,
        nextFollowUp: input.nextFollowUp,
      })
      return res.status(201).json(item)
    } catch (error) {
      return res.status(400).json({ message: 'Invalid input' })
    }
  },

  async update(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const data = updatePipelineItemSchema.parse(req.body)
      const item = await pipelineService.updatePipelineItem({
        id: req.params.id,
        userId: req.auth.uid,
        data,
      })
      return res.json(item)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur'
      const statusCode = message === 'Unauthorized' ? 403 : 400
      return res.status(statusCode).json({ message })
    }
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const result = await pipelineService.deletePipelineItem(req.params.id, req.auth.uid)
      return res.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur'
      const statusCode = message === 'Unauthorized' ? 403 : 404
      return res.status(statusCode).json({ message })
    }
  },

  async getStats(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const stats = await pipelineService.getPipelineStats(req.auth.uid)
      return res.json(stats)
    } catch (error) {
      return res.status(500).json({ message: 'Erreur lors du calcul des statistiques' })
    }
  },
}
