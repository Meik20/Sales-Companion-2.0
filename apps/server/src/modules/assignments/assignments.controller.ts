import type { Response } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../types/express'
import { assignmentsService } from './assignments.service'

const createAssignmentSchema = z.object({
  assigneeId: z.string().min(1),
  assigneeUid: z.string().optional(),
  prospectIds: z.array(z.string()).min(1),
  note: z.string().optional()
})

export const assignmentsController = {
  async create(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const input = createAssignmentSchema.parse(req.body)

    const result = await assignmentsService.create({
      managerUid: req.auth.uid,
      managerName: req.auth.email,
      assigneeId: input.assigneeId,
      assigneeUid: input.assigneeUid,
      prospectIds: input.prospectIds,
      note: input.note
    })

    return res.status(201).json(result)
  },

  async listByManager(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const items = await assignmentsService.listByManager(req.auth.uid)
    return res.json({ items })
  }
}