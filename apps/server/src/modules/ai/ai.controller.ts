import type { Request, Response } from 'express'
import { aiService } from './ai.service'

export const aiController = {
  async pitch(_req: Request, res: Response) {
    return res.json(await aiService.buildPitch())
  },

  async searchSummary(_req: Request, res: Response) {
    return res.json(await aiService.buildSearchSummary())
  }
}