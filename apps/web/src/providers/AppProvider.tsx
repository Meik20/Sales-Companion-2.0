'use client'

import { ReactNode, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './ToastProvider'
import { PWAInitializer } from '@/components/PWAInitializer'
import { NetworkStatusBanner } from '@/components/ui/NetworkStatusBanner'
import { UserProvider } from '@/hooks/useCurrentUser'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      retry: (failureCount) => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return false
        return failureCount < 2
      },
      staleTime: 5 * 60 * 1000
    },
    mutations: {
      networkMode: 'offlineFirst'
    }
  }
})

export function AppProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Polyfill for crypto.randomUUID if not available
    if (!globalThis.crypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: {}
      })
    }
    if (!globalThis.crypto.randomUUID) {
      globalThis.crypto.randomUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = (Math.random() * 16) | 0
          const v = c === 'x' ? r : (r & 0x3) | 0x8
          return v.toString(16)
        }) as `${string}-${string}-${string}-${string}-${string}`
      }
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <ToastProvider>
          <NetworkStatusBanner />
          <PWAInitializer />
          {children}
        </ToastProvider>
      </UserProvider>
    </QueryClientProvider>
  )
}

