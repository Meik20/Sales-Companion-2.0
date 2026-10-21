'use client'

import { useCallback, useEffect, useState } from 'react'

export type DesignTheme = 'firebase'

const STORAGE_KEY = 'sc-design-theme'

/** Lit la préférence de design (thème unique Firebase Console). */
export function useDesignTheme() {
  const [design] = useState<DesignTheme>('firebase')

  const applyDesign = useCallback((d: DesignTheme) => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-design', d)
  }, [])

  useEffect(() => {
    applyDesign('firebase')
    try {
      if (localStorage.getItem(STORAGE_KEY) !== 'firebase') {
        localStorage.setItem(STORAGE_KEY, 'firebase')
      }
    } catch {
      // safe fallback
    }
  }, [applyDesign])

  const setDesign = useCallback(async (_d: DesignTheme) => {
    // Thème unique Firebase Console
  }, [])

  const toggle = useCallback(() => {}, [])

  return { design, setDesign, toggle }
}

