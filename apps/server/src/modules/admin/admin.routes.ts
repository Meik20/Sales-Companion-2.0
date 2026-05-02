import { Router } from 'express'
import { adminController } from './admin.controller'
import { asyncHandler } from '../../utils/async-handler'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { adminMiddleware } from '../../middlewares/admin.middleware'

export const adminRoutes = Router()

adminRoutes.use('/admin', authMiddleware, adminMiddleware)

adminRoutes.get('/admin/stats', asyncHandler(adminController.getStats))
adminRoutes.post('/admin/init', asyncHandler(adminController.initAdmin))

adminRoutes.get('/admin/users', asyncHandler(adminController.listUsers))
adminRoutes.patch('/admin/users/:uid', asyncHandler(adminController.updateUser))
adminRoutes.delete('/admin/users/:uid', asyncHandler(adminController.deleteUser))

adminRoutes.get('/admin/companies', asyncHandler(adminController.getCompanies))