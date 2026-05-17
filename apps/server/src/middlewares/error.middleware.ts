import type { NextFunction, Request, Response } from 'express'
import { logger } from '../utils/logger'

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  logger.error(error)

  const isDev = process.env.NODE_ENV === 'development'
  const message = error instanceof Error ? error.message : 'Internal server error'

  // If it's a known client error, we can return it safely
  if (
    message.includes('Unsupported file type') ||
    message.includes('max rows limit') ||
    message.includes('max headers limit') ||
    message.includes('No file uploaded') ||
    message.includes("identifiant n'est plus disponible") ||
    message.includes('Unauthorized') ||
    message.includes('Forbidden')
  ) {
    return res.status(400).json({ message })
  }

  // Generic error response for 500s to avoid leaking internals
  return res.status(500).json({
    message: isDev ? message : 'Une erreur interne est survenue. Veuillez réessayer plus tard.',
    error: isDev ? error : undefined
  })
}
