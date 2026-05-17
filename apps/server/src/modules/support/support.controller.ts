import type { Request, Response } from 'express'
import { z } from 'zod'
import { supportService } from './support.service'

const replySchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(1),
  adminUid: z.string().min(1)
})

export const supportController = {
  async list(_req: Request, res: Response) {
    return res.json({ items: await supportService.listThreads() })
  },

  async reply(req: Request, res: Response) {
    const input = replySchema.parse(req.body)
    return res.status(201).json(await supportService.replyToThread(input))
  }
}
