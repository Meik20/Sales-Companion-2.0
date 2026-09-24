'use client'

import { ReactNode, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './ToastProvider'
import { PWAInitializer } from '@/components/PWAInitializer'
import { NetworkStatusBanner } from '@/components/ui/NetworkStatusBanner'
import { UserProvider } from '@/hooks/useCurrentUser'
import { isMobileRuntime } from '@/lib/runtime'

function createQueryClient(mobile: boolean) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: mobile ? 'offlineFirst' : 'online',
        retry: (failureCount) => {
          if (typeof navigator !== 'undefined' && !navigator.onLine) return false
          return failureCount < 2
        },
        staleTime: 5 * 60 * 1000
      },
      mutations: {
        networkMode: mobile ? 'offlineFirst' : 'online'
      }
    }
  })
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [queryClient, setQueryClient] = useState(() => createQueryClient(false))

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
    if (isMobileRuntime()) {
      setQueryClient(createQueryClient(true))
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

