'use client'

import { useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'

/**
 * Root page — smart redirect:
 *  - PWA standalone (installée sur mobile) → /login  (pas de landing page)
 *  - Authenticated user                    → /search
 *  - Unauthenticated user (browser normal) → /landing.html
 */
export default function Home() {
  const { user, loading } = useCurrentUser()

  useEffect(() => {
    if (loading) return

    // ── Détection mode PWA installée (standalone) ──
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true

    if (user) {
      // Utilisateur authentifié → app principale
      window.location.replace('/search')
    } else if (isStandalone) {
      // PWA installée, non connecté → page de connexion (jamais la landing)
      window.location.replace('/login')
    } else {
      // Navigateur classique, non connecté → landing marketing
      window.location.replace('/landing.html')
    }
  }, [user, loading])

  // Écran vide le temps de résoudre — pas de flash
  return null
}

