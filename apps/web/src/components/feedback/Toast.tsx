'use client'

import { useEffect } from 'react'

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

const TOAST_MAP: Record<
  ToastData['type'],
  { wrapper: string; icon: string; iconWrapper: string; iconColor: string }
> = {
  success: {
    wrapper: 'border-green-500/30',
    iconWrapper: 'bg-green-500/10 border border-green-500/30',
    icon: '✓',
    iconColor: 'text-green-400'
  },
  error: {
    wrapper: 'border-red-500/30',
    iconWrapper: 'bg-red-500/10 border border-red-500/30',
    icon: '✕',
    iconColor: 'text-red-400'
  },
  warning: {
    wrapper: 'border-amber-500/30',
    iconWrapper: 'bg-amber-500/10 border border-amber-500/30',
    icon: '!',
    iconColor: 'text-amber-400'
  },
  info: {
    wrapper: 'border-blue-400/30',
    iconWrapper: 'bg-blue-400/10 border border-blue-400/30',
    icon: 'i',
    iconColor: 'text-blue-400'
  }
}

export function Toast({ toast, onDismiss }: Props) {
  const s = TOAST_MAP[toast.type]

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  return (
    <div
      onClick={() => onDismiss(toast.id)}
      className={`flex min-w-[300px] max-w-[420px] cursor-pointer items-start gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${s.wrapper}`}
      style={{ animation: 'fadeIn 200ms ease' }}
    >
      <span
        className={`mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${s.iconWrapper} ${s.iconColor}`}
      >
        {s.icon}
      </span>
      <div>
        <p className="m-0 text-[13px] font-semibold text-foreground">{toast.title}</p>
        {toast.description ? (
          <p className="m-0 mt-0.5 text-[12px] text-muted-foreground">{toast.description}</p>
        ) : null}
      </div>
    </div>
  )
}
