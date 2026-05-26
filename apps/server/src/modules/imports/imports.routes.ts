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

  // Accepter tous les fichiers texte courants
  // .csv, .xlsx, .xls, .txt, .tsv, .json, .dat, .log, .txt, etc.
  const allowedExts = ['csv', 'xlsx', 'xls', 'txt', 'tsv', 'json', 'dat', 'log', 'tab', 'pipe']
  const ext = lower.split('.').pop()

  if (ext && (allowedExts.includes(ext) || file.mimetype.startsWith('text/'))) {
    cb(null, true)
    return
  }

  cb(new Error('Unsupported file type. Please use text-based files (csv, txt, xlsx, etc.)'))
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
