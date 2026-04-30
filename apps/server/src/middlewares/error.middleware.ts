import type { NextFunction, Request, Response } from 'express'
import { logger } from '../utils/logger'

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(error)

  const message =
    error instanceof Error ? error.message : 'Internal server error'

  if (
    message.includes('Unsupported file type') ||
    message.includes('max rows limit') ||
    message.includes('max headers limit') ||
    message.includes('No file uploaded')
  ) {
    return res.status(400).json({ message })
  }

  return res.status(500).json({ message })
}