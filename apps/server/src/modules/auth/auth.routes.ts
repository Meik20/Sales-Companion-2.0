import { Router } from 'express'
import { authController } from './auth.controller'
import { asyncHandler } from '../../utils/async-handler'

export const authRoutes = Router()

authRoutes.post('/admin/login', asyncHandler(authController.adminLogin))