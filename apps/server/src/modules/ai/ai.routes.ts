import { Router } from 'express'
import { asyncHandler } from '../../utils/async-handler'
import { aiController } from './ai.controller'

export const aiRoutes = Router()

aiRoutes.post('/ai/pitch', asyncHandler(aiController.pitch))
aiRoutes.post('/ai/search-summary', asyncHandler(aiController.searchSummary))
