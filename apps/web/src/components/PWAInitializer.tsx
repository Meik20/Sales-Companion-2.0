'use client'

import { useEffect } from 'react'
import { usePWARegistration } from '@/hooks/usePWARegistration'

export function PWAInitializer() {
  const { state } = usePWARegistration()

  useEffect(() => {
    // Log PWA state for debugging
    console.log('[PWA] State:', state)
  }, [state])

  return null
}
