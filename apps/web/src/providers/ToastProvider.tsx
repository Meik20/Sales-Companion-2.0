'use client'

import { createContext, useContext, useState, useCallback, PropsWithChildren } from 'react'
import { Toast, ToastData } from '@/components/feedback/Toast'

type ToastInput = Omit<ToastData, 'id'>

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue>({ pushToast: () => {} })

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const pushToast = useCallback((input: ToastInput) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { ...input, id }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}

      {/* Viewport */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none'
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <Toast toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  return useContext(ToastContext)
}
