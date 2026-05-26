import type { NextFunction, Response } from 'express'
import { adminDb } from '../firebase/admin'
import type { AuthenticatedRequest } from '../types/express'

export async function managerMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.auth?.uid) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const userDoc = await adminDb.collection('users').doc(req.auth.uid).get()

    if (!userDoc.exists) {
      return res.status(403).json({ message: 'Manager profile not found' })
    }

    const user = userDoc.data()

    if (user?.role !== 'manager') {
      return res.status(403).json({ message: 'Manager role required' })
    }

    next()
  } catch {
    return res.status(500).json({ message: 'Unable to validate manager role' })
  }
}
