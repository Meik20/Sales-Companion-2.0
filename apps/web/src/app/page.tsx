'use client'

import { useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'

/**
 * Root page — smart redirect:
 *  - Authenticated user   → /search  (main app entry point)
 *  - Unauthenticated user → /landing.html
 *
 * This covers the case where someone pastes the root URL manually.
 * All other protected routes are handled by AuthGuard inside AppShell.
 */
export default function Home() {
  const { user, loading } = useCurrentUser()

  useEffect(() => {
    if (loading) return
    if (user) {
      window.location.replace('/search')
    } else {
      window.location.replace('/landing.html')
    }
  }, [user, loading])

  // Blank while resolving — no flash
  return null
}
