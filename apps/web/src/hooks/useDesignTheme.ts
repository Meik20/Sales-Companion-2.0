'use client'

import { useCallback, useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { auth } from '@/services/firebase/client'

export type DesignTheme = 'linkedin' | 'firebase'

const STORAGE_KEY = 'sc-design-theme'

/** Lit/écrit la préférence de design (LinkedIn vs Firebase) de l'utilisateur.
 *  - Persistance instantanée via localStorage (zéro-flash)
 *  - Synchronisation asynchrone vers Firestore (pour retrouver le thème sur d'autres appareils)
 */
export function useDesignTheme() {
  const [design, setDesignState] = useState<DesignTheme>(() => {
    if (typeof window === 'undefined') return 'linkedin'
    return (localStorage.getItem(STORAGE_KEY) as DesignTheme) ?? 'linkedin'
  })

  /** Applique l'attribut data-design sur <html> */
  const applyDesign = useCallback((d: DesignTheme) => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    html.setAttribute('data-design', d)
  }, [])

  // Applique au montage
  useEffect(() => {
    applyDesign(design)
  }, [design, applyDesign])

  /** Change le thème visuellement + persiste */
  const setDesign = useCallback(
    async (d: DesignTheme) => {
      setDesignState(d)
      applyDesign(d)
      localStorage.setItem(STORAGE_KEY, d)

      // Synchronisation Firestore (best-effort, non-bloquant)
      const user = auth.currentUser
      if (user) {
        try {
          await updateDoc(doc(firestore, 'users', user.uid), {
            'preferences.designTheme': d
          })
        } catch {
          // On ne bloque pas l'UX si Firestore est inaccessible
        }
      }
    },
    [applyDesign]
  )

  const toggle = useCallback(() => {
    setDesign(design === 'linkedin' ? 'firebase' : 'linkedin')
  }, [design, setDesign])

  return { design, setDesign, toggle }
}
