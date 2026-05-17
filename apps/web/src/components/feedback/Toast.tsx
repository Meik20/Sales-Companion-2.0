'use client'

import { useEffect } from 'react'
import { colors } from '@/styles/tokens'

export type ToastData = {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  description?: string
}

type Props = {
  toast: ToastData
  onDismiss: (id: string) => void
}

const toastStyles: Record<
  ToastData['type'],
  { bg: string; border: string; icon: string; color: string }
> = {
  success: {
    bg: 'rgba(27,122,62,0.12)',
    border: 'rgba(46,160,90,0.3)',
    icon: '✓',
    color: '#4ade80'
  },
  error: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: '✕', color: '#f87171' },
  warning: {
    bg: 'rgba(245,166,35,0.1)',
    border: 'rgba(245,166,35,0.3)',
    icon: '!',
    color: '#fbbf24'
  },
  info: { bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)', icon: 'i', color: '#60a5fa' }
}

export function Toast({ toast, onDismiss }: Props) {
  const s = toastStyles[toast.type]

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        background: colors.bg2,
        border: `1px solid ${s.border}`,
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        minWidth: 300,
        maxWidth: 420,
        animation: 'fadeIn 200ms ease',
        cursor: 'pointer'
      }}
      onClick={() => onDismiss(toast.id)}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: s.bg,
          border: `1px solid ${s.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: s.color,
          flexShrink: 0,
          marginTop: 1
        }}
      >
        {s.icon}
      </span>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.text }}>
          {toast.title}
        </p>
        {toast.description ? (
          <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.textMid }}>
            {toast.description}
          </p>
        ) : null}
      </div>
    </div>
  )
}
