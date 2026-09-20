'use client'

import { useState, useEffect, useCallback } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  isManualOffline: boolean
  toggleManualOffline: () => void
  setManualOffline: (val: boolean) => void
  wasOffline: boolean
  dismissReconnected: () => void
}

const MANUAL_OFFLINE_KEY = 'sc_manual_offline'

export function useNetworkStatus(): NetworkStatus {
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine
    }
    return true
  })

  const [isManualOffline, setIsManualOfflineState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem(MANUAL_OFFLINE_KEY) === 'true'
      } catch {
        return false
      }
    }
    return false
  })

  const [wasOffline, setWasOffline] = useState<boolean>(false)

  const isOnline = isBrowserOnline && !isManualOffline

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsBrowserOnline(true)
      if (!isManualOffline) {
        setWasOffline(true)
      }
    }

    const handleOffline = () => {
      setIsBrowserOnline(false)
      setWasOffline(false)
    }

    const handleManualOfflineEvent = () => {
      try {
        setIsManualOfflineState(sessionStorage.getItem(MANUAL_OFFLINE_KEY) === 'true')
      } catch {}
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('sc_manual_offline_changed', handleManualOfflineEvent)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('sc_manual_offline_changed', handleManualOfflineEvent)
    }
  }, [isManualOffline])

  useEffect(() => {
    if (wasOffline && isOnline) {
      const timer = setTimeout(() => {
        setWasOffline(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [wasOffline, isOnline])

  const setManualOffline = useCallback((val: boolean) => {
    setIsManualOfflineState(val)
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(MANUAL_OFFLINE_KEY, val ? 'true' : 'false')
        window.dispatchEvent(new Event('sc_manual_offline_changed'))
      } catch {}
    }
    if (!val) {
      setWasOffline(true)
    }
  }, [])

  const toggleManualOffline = useCallback(() => {
    setManualOffline(!isManualOffline)
  }, [isManualOffline, setManualOffline])

  const dismissReconnected = () => setWasOffline(false)

  return { isOnline, isManualOffline, toggleManualOffline, setManualOffline, wasOffline, dismissReconnected }
}
