'use client'

import { PropsWithChildren } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'

/** Garde d’auth pour toutes les pages du groupe (protected), y compris /ai sans AppShell. */
export default function ProtectedLayout({ children }: PropsWithChildren) {
  return <AuthGuard>{children}</AuthGuard>
}
