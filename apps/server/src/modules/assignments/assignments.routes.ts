import { Router } from 'express'
import { asyncHandler } from '../../utils/async-handler'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { managerMiddleware } from '../../middlewares/manager.middleware'
import { assignmentsController } from './assignments.controller'

export const assignmentsRoutes = Router()

assignmentsRoutes.post(
  '/assignments',
  authMiddleware,
  managerMiddleware,
  asyncHandler(assignmentsController.create)
)

assignmentsRoutes.get(
  '/assignments',
  authMiddleware,
  managerMiddleware,
  asyncHandler(assignmentsController.listByManager)
)