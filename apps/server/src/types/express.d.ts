import type { Request } from 'express'

export type AuthenticatedRequest = Request & {
  auth?: {
    uid: string
    email?: string
    role?: string
  }
}