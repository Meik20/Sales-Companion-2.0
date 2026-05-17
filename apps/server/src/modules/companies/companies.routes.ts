import { Router } from 'express'
import { companiesController } from './companies.controller'
import { asyncHandler } from '../../utils/async-handler'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { adminMiddleware } from '../../middlewares/admin.middleware'

export const companiesRoutes = Router()

companiesRoutes.use('/admin/companies', authMiddleware, adminMiddleware)

companiesRoutes.get('/admin/companies', asyncHandler(companiesController.list))
companiesRoutes.delete('/admin/companies/:id', asyncHandler(companiesController.deleteOne))
companiesRoutes.delete('/admin/companies', asyncHandler(companiesController.deleteAll))
