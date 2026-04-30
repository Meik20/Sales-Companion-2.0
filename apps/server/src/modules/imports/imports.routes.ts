import { Router } from 'express'
import multer from 'multer'
import { importsController } from './imports.controller'
import { asyncHandler } from '../../utils/async-handler'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { adminMiddleware } from '../../middlewares/admin.middleware'

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const lower = file.originalname.toLowerCase()

  if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    cb(null, true)
    return
  }

  cb(new Error('Unsupported file type'))
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024
  }
})

export const importsRoutes = Router()

importsRoutes.post(
  '/admin/import/preview',
  authMiddleware,
  adminMiddleware,
  upload.single('file'),
  asyncHandler(importsController.preview)
)

importsRoutes.post(
  '/admin/import',
  authMiddleware,
  adminMiddleware,
  upload.single('file'),
  asyncHandler(importsController.upload)
)

importsRoutes.get(
  '/admin/import-logs',
  authMiddleware,
  adminMiddleware,
  asyncHandler(importsController.logs)
)

importsRoutes.get(
  '/admin/imports',
  authMiddleware,
  adminMiddleware,
  asyncHandler(importsController.getImports)
)