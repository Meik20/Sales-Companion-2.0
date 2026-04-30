import { Router } from 'express'
import { asyncHandler } from '../../utils/async-handler'
import { pipelineController } from './pipeline.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

export const pipelineRoutes = Router()

pipelineRoutes.get('/pipeline', authMiddleware, asyncHandler(pipelineController.list))

pipelineRoutes.post('/pipeline', authMiddleware, asyncHandler(pipelineController.create))

pipelineRoutes.get('/pipeline/:id', authMiddleware, asyncHandler(pipelineController.get))

pipelineRoutes.put('/pipeline/:id', authMiddleware, asyncHandler(pipelineController.update))

pipelineRoutes.delete('/pipeline/:id', authMiddleware, asyncHandler(pipelineController.delete))

pipelineRoutes.get('/pipeline/stats/summary', authMiddleware, asyncHandler(pipelineController.getStats))
