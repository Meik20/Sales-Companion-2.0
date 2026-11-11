'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { isMobileRuntime } from '@/lib/runtime'
import { getQueuedMutations, processOfflineQueue } from '@/lib/offline-sync'

export interface NetworkStatus {
  isOnline: boolean
  isManualOffline: boolean
  isChecking: boolean
  toggleManualOffline: () => void
  setManualOffline: (val: boolean) => void
  checkConnectivity: () => Promise<boolean>
  wasOffline: boolean
  dismissReconnected: () => void
  pendingCount: number
  isSyncing: boolean
  syncNow: () => Promise<void>
}

const MANUAL_OFFLINE_KEY = 'sc_manual_offline'

export function useNetworkStatus(): NetworkStatus {
  const mobileRuntime = isMobileRuntime()
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(true)

  // Detect real data connectivity (for cases where WiFi/4G is connected but there's no data credit)
  const [hasRealInternet, setHasRealInternet] = useState<boolean>(true)
  const [isChecking, setIsChecking] = useState<boolean>(false)

  const [isManualOffline, setIsManualOfflineState] = useState<boolean>(false)

  useEffect(() => {
    if (mobileRuntime && typeof navigator !== 'undefined') {
      setIsBrowserOnline(navigator.onLine)
    }
    if (mobileRuntime && typeof window !== 'undefined') {
      try {
        setIsManualOfflineState(sessionStorage.getItem(MANUAL_OFFLINE_KEY) === 'true')
      } catch {}
    }
  }, [mobileRuntime])

  const [wasOffline, setWasOffline] = useState<boolean>(false)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  const updateQueueCount = useCallback(() => {
    setPendingCount(getQueuedMutations().length)
  }, [])

  const syncNow = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await processOfflineQueue()
      updateQueueCount()
    } catch (e) {
      console.warn('[useNetworkStatus] syncNow failed:', e)
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, updateQueueCount])

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
      // Timeout généreux (8s) pour absorber les latences mobiles africaines
      // et les cold-starts Vercel, sans faussement déclarer l'appareil hors-ligne.
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const res = await fetch(`/api/health?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // /api/health répond toujours 200 si le serveur est atteignable.
      // On considère l'appareil en ligne dès que le serveur répond avec un code < 500.
      if (res.status < 500) {
        setHasRealInternet(true)
        return true
      } else {
        // 503+ = serveur indisponible (crash Vercel, maintenance) ≠ pas de connexion
        // On effectue un 2ème essai après 1s avant de déclarer hors-ligne
        await new Promise((r) => setTimeout(r, 1000))
        try {
          const retry = await fetch(`/api/health?t=${Date.now()}&retry=1`, {
            method: 'GET',
            cache: 'no-store',
            signal: AbortSignal.timeout(5000)
          })
          if (retry.status < 500) {
            setHasRealInternet(true)
            return true
          }
        } catch {
          // 2ème tentative aussi échouée
        }
        setHasRealInternet(false)
        return false
      }
    } catch {
      // Timeout AbortController ou erreur réseau réelle
      // On tente un fallback sur une ressource statique publique déjà en cache SW
      try {
        const fallback = await fetch('/favicon.svg', {
          method: 'HEAD',
          cache: 'force-cache',
          signal: AbortSignal.timeout(3000)
        })
        if (fallback.ok) {
          // La ressource statique est atteignable (depuis cache ou réseau) → online
          setHasRealInternet(true)
          return true
        }
      } catch {
        // Réellement hors ligne
      }
      setHasRealInternet(false)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !isMobileRuntime()) return

    // Run active probe on mount to detect current data status
    checkConnectivity()
    updateQueueCount()

    const handleOnline = () => {
      setIsBrowserOnline(true)
      checkConnectivity().then((ok) => {
        if (ok && !isManualOffline) {
          setWasOffline(true)
          void syncNow()
        }
      })
    }

    const handleQueueChanged = () => {
      updateQueueCount()
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

    // Ping every 60 seconds while tab is active.
    // 25s was too aggressive on mobile: wasted battery and caused false-offline
    // triggers during momentary network transitions (WiFi handover, 4G→3G, etc.)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isManualOffline) {
        checkConnectivity()
      }
    }, 60000)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('sc_manual_offline_changed', handleManualOfflineEvent)
    window.addEventListener('sc-offline-queue-changed', handleQueueChanged)
    window.addEventListener('storage', handleQueueChanged)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('sc_manual_offline_changed', handleManualOfflineEvent)
      window.removeEventListener('sc-offline-queue-changed', handleQueueChanged)
      window.removeEventListener('storage', handleQueueChanged)
    }
  }, [checkConnectivity, isManualOffline, syncNow, updateQueueCount])

  useEffect(() => {
    if (wasOffline && isOnline) {
      const timer = setTimeout(() => {
        setWasOffline(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [wasOffline, isOnline])

  const setManualOffline = useCallback(
    (val: boolean) => {
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
    },
    [checkConnectivity]
  )

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
    dismissReconnected,
    pendingCount,
    isSyncing,
    syncNow
  }
}
