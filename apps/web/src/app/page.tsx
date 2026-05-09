'use client'

import { useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { LandingPage } from '@/features/landing/components/LandingPage'

/**
 * Root page — smart redirect:
 *  - PWA standalone (installée sur mobile) → /login  (pas de landing page)
 *  - Authenticated user                    → /search
 *  - Unauthenticated user (browser normal) → Renders LandingPage directly
 */
export default function Home() {
  const { user, loading } = useCurrentUser()

  useEffect(() => {
    if (loading) return

    // ── Détection mode PWA installée (standalone) ──
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true ||
      window.location.search.includes('source=pwa')

    if (user) {
      // Utilisateur authentifié → app principale
      window.location.replace('/search')
    } else if (isStandalone) {
      // PWA installée, non connecté → page de connexion (jamais la landing)
      window.location.replace('/login')
    }
  }, [user, loading])

  if (loading || user) return null

  // Navigateur classique, non connecté → landing marketing
  return <LandingPage />
}

