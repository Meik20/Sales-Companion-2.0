import type { NextFunction, Response } from 'express'
import { adminAuth } from '../firebase/admin'
import type { AuthenticatedRequest } from '../types/express'

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    req.auth = {
      uid: decoded.uid,
      email: decoded.email,
      role: typeof decoded.role === 'string' ? decoded.role : undefined
    }
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}