import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest } from '../types/express'

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' })
  }

  next()
}
