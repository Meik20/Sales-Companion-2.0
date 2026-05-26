'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/useToast'

type ServiceWorkerState = 'idle' | 'installing' | 'installed' | 'updating' | 'error'

export function usePWARegistration() {
  const [state, setState] = useState<ServiceWorkerState>('idle')
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const { pushToast } = useToast()

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    async function registerServiceWorker() {
      try {
        setState('installing')
        console.log('[PWA] Registering service worker...')

        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        })

        setRegistration(reg)
        console.log('[PWA] Service Worker registered successfully')
        setState('installed')

        // Check for updates periodically
        setInterval(() => {
          reg.update().catch((err) => console.warn('[PWA] Update check failed:', err))
        }, 60000) // Every minute

        // Listen for new service worker
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          console.log('[PWA] New service worker found')
          setState('updating')

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready
              console.log('[PWA] New service worker ready to activate')
              pushToast({
                type: 'info',
                title: 'Mise à jour disponible',
                description: "Une nouvelle version est prête. Rechargez la page pour l'activer."
              })
              setState('installed')
            }
          })
        })
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error)
        setState('error')
        pushToast({
          type: 'error',
          title: 'Erreur PWA',
          description: "Impossible d'enregistrer le service worker."
        })
      }
    }

    registerServiceWorker()
  }, [pushToast])

  // Listen for controller change (new service worker activated)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const handleControllerChange = () => {
      console.log('[PWA] Service Worker controller changed')
      // Optionally refresh the page
      // window.location.reload()
    }

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange)

    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  // Listen for messages from service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const handleMessage = (event: MessageEvent) => {
      const { data } = event
      if (data?.type === 'SYNC_COMPLETE') {
        console.log('[PWA] Background sync completed:', data.count, 'actions')
        pushToast({
          type: 'success',
          title: 'Synchronisation',
          description: `${data.count} action${data.count > 1 ? 's' : ''} synchronisée${data.count > 1 ? 's' : ''}.`
        })
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [pushToast])

  return {
    state,
    registration,
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
    isInstalled: state === 'installed'
  }
}

export function requestPushPermission() {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('Notification' in window)
  ) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      console.log('[PWA] Notification permission:', permission)
    })
  }

  return false
}

export function triggerBackgroundSync(tag = 'sync-pending-actions') {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.reject(new Error('Service Worker not supported'))
  }

  return navigator.serviceWorker.ready.then((registration) => {
    if (!('sync' in registration)) {
      console.warn('[PWA] Background Sync not supported')
      return
    }

    return (registration as any).sync.register(tag)
  })
}

export function installPWA() {
  if (typeof window === 'undefined') return

  let deferredPrompt: any = null

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e
  })

  return deferredPrompt
}
