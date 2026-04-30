import { Router } from 'express'
import { asyncHandler } from '../../utils/async-handler'
import { supportController } from './support.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { adminMiddleware } from '../../middlewares/admin.middleware'

export const supportRoutes = Router()

supportRoutes.get(
  '/admin/support',
  authMiddleware,
  adminMiddleware,
  asyncHandler(supportController.list)
)

supportRoutes.post(
  '/admin/support/reply',
  authMiddleware,
  adminMiddleware,
  asyncHandler(supportController.reply)
)