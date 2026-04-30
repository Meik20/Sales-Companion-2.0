import type { Request, Response } from 'express'
import { aiService } from './ai.service'

export const aiController = {
  async pitch(req: Request, res: Response) {
    return res.json(await aiService.buildPitch(req.body))
  },

  async searchSummary(req: Request, res: Response) {
    return res.json(await aiService.buildSearchSummary(req.body))
  }
}