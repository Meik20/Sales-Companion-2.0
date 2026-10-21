'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'sc-design-theme'

function applyDesign(d: 'firebase') {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-design', d)
  }
}

/**
 * Applique data-design="firebase" sur <html> dès que possible :
 * - Thème unique Firebase Console (Navy & Amber) pour l'ensemble du projet
 * - Réinitialise tout résidu obsolète 'linkedin' dans le localStorage
 */
export function DesignThemeProvider() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== 'firebase') {
        localStorage.setItem(STORAGE_KEY, 'firebase')
      }
    } catch {
      // Silencieux
    }
    applyDesign('firebase')
  }, [])

  return null
}

