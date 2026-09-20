'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  isManualOffline: boolean
  isChecking: boolean
  toggleManualOffline: () => void
  setManualOffline: (val: boolean) => void
  checkConnectivity: () => Promise<boolean>
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

  // Detect real data connectivity (for cases where WiFi/4G is connected but there's no data credit)
  const [hasRealInternet, setHasRealInternet] = useState<boolean>(true)
  const [isChecking, setIsChecking] = useState<boolean>(false)

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

  // Overall effective online state: must have browser connection, working internet data, and not be in manual offline mode
  const isOnline = isBrowserOnline && hasRealInternet && !isManualOffline

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return true
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setHasRealInternet(false)
      return false
    }

    try {
      setIsChecking(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3500)

      const res = await fetch(`/api/health?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (res.ok && res.status === 200) {
        setHasRealInternet(true)
        return true
      } else {
        // Status 503 from Service Worker or non-200 from server = no data
        setHasRealInternet(false)
        return false
      }
    } catch {
      // Failed to fetch or timeout = no data / out of credit / offline
      setHasRealInternet(false)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Run active probe on mount to detect current data status
    checkConnectivity()

    const handleOnline = () => {
      setIsBrowserOnline(true)
      checkConnectivity().then((ok) => {
        if (ok && !isManualOffline) {
          setWasOffline(true)
        }
      })
    }

    const handleOffline = () => {
      setIsBrowserOnline(false)
      setHasRealInternet(false)
      setWasOffline(false)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isManualOffline) {
        checkConnectivity()
      }
    }

    const handleManualOfflineEvent = () => {
      try {
        setIsManualOfflineState(sessionStorage.getItem(MANUAL_OFFLINE_KEY) === 'true')
      } catch {}
    }

    // Ping every 25 seconds while tab is active to detect data exhaustion or drops in real time
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isManualOffline) {
        checkConnectivity()
      }
    }, 25000)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('sc_manual_offline_changed', handleManualOfflineEvent)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('sc_manual_offline_changed', handleManualOfflineEvent)
    }
  }, [checkConnectivity, isManualOffline])

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
      checkConnectivity()
    }
  }, [checkConnectivity])

  const toggleManualOffline = useCallback(() => {
    setManualOffline(!isManualOffline)
  }, [isManualOffline, setManualOffline])

  const dismissReconnected = () => setWasOffline(false)

  return {
    isOnline,
    isManualOffline,
    isChecking,
    toggleManualOffline,
    setManualOffline,
    checkConnectivity,
    wasOffline,
    dismissReconnected
  }
}
