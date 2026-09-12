'use client'

import { useState, useEffect } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  wasOffline: boolean
  dismissReconnected: () => void
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine
    }
    return true
  })
  const [wasOffline, setWasOffline] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (wasOffline && isOnline) {
      const timer = setTimeout(() => {
        setWasOffline(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [wasOffline, isOnline])

  const dismissReconnected = () => setWasOffline(false)

  return { isOnline, wasOffline, dismissReconnected }
}
