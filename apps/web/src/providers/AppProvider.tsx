'use client'

import { ReactNode, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './ToastProvider'
import { PWAInitializer } from '@/components/PWAInitializer'

const queryClient = new QueryClient()

export function AppProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Polyfill for crypto.randomUUID if not available
    if (!globalThis.crypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: {},
      })
    }
    if (!globalThis.crypto.randomUUID) {
      globalThis.crypto.randomUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = (Math.random() * 16) | 0
          const v = c === 'x' ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      }
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PWAInitializer />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  )
}
