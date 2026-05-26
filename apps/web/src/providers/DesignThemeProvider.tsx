'use client'

import { useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { auth, firestore } from '@/services/firebase/client'

const STORAGE_KEY = 'sc-design-theme'
type DesignTheme = 'linkedin' | 'firebase'

function applyDesign(d: DesignTheme) {
  document.documentElement.setAttribute('data-design', d)
}

/**
 * Applique data-design="linkedin"|"firebase" sur <html> dès que possible :
 * 1. Immédiatement depuis localStorage → zéro flash au chargement
 * 2. Puis synchronisation Firestore pour cohérence multi-appareils
 *
 * Note : si aucune préférence n'est enregistrée, linkedin est appliqué par défaut.
 */
export function DesignThemeProvider() {
  useEffect(() => {
    // 1. Lecture du localStorage — applique immédiatement, avant tout rendu
    const stored = (localStorage.getItem(STORAGE_KEY) as DesignTheme | null) ?? 'linkedin'
    applyDesign(stored)

    // 2. Synchronisation Firestore asynchrone (best-effort, non-bloquant)
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return
      try {
        const snap = await getDoc(doc(firestore, 'users', user.uid))
        if (!snap.exists()) return
        const remote = snap.data()?.preferences?.designTheme as DesignTheme | undefined
        if (remote && (remote === 'linkedin' || remote === 'firebase') && remote !== stored) {
          localStorage.setItem(STORAGE_KEY, remote)
          applyDesign(remote)
        }
      } catch {
        // Silencieux — localStorage sert de fallback fiable
      }
    })

    return () => unsubscribe()
  }, [])

  return null
}
