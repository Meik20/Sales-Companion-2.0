import type { Request, Response } from 'express'
import { importsService } from './imports.service'

function parseJsonField<T>(value: unknown): T | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  return JSON.parse(value) as T
}

export const importsController = {
  async preview(req: Request, res: Response) {
    const file = req.file

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const result = await importsService.previewCompaniesFile({
      buffer: file.buffer,
      filename: file.originalname,
      sheetName: typeof req.body?.sheetName === 'string' ? req.body.sheetName : undefined,
      mapping: parseJsonField(req.body?.mapping)
    })

    return res.json(result)
  },

  async upload(req: Request, res: Response) {
    const file = req.file

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const result = await importsService.importCompaniesFile({
      buffer: file.buffer,
      filename: file.originalname,
      sourceFile:
        typeof req.body?.sourceFile === 'string' ? req.body.sourceFile : file.originalname,
      importedBy: typeof req.body?.importedBy === 'string' ? req.body.importedBy : undefined,
      sheetName: typeof req.body?.sheetName === 'string' ? req.body.sheetName : undefined,
      mapping: parseJsonField(req.body?.mapping),
      dryRun: req.body?.dryRun === 'true'
    })

    return res.status(201).json(result)
  },

  async logs(_req: Request, res: Response) {
    return res.json({ items: await importsService.getLogs() })
  },

  async getImports(req: Request, res: Response) {
    const page = req.query.page ? parseInt(req.query.page as string) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20

    const result = await importsService.getLogsPaginated(page, pageSize)
    return res.json(result)
  }
}
