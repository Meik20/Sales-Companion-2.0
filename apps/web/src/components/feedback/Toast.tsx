'use client'

import React, { useEffect } from 'react'
import { Check, X, AlertTriangle, Info } from 'lucide-react'

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
  { wrapper: string; icon: React.ReactNode; iconWrapper: string; iconColor: string }
> = {
  success: {
    wrapper: 'border-emerald-500/30 dark:border-emerald-500/40',
    iconWrapper: 'bg-emerald-500/10 border border-emerald-500/30',
    icon: <Check size={12} strokeWidth={2.5} />,
    iconColor: 'text-emerald-500'
  },
  error: {
    wrapper: 'border-destructive/30 dark:border-destructive/40',
    iconWrapper: 'bg-destructive/10 border border-destructive/30',
    icon: <X size={12} strokeWidth={2.5} />,
    iconColor: 'text-destructive'
  },
  warning: {
    wrapper: 'border-amber-500/30 dark:border-amber-500/40',
    iconWrapper: 'bg-amber-500/10 border border-amber-500/30',
    icon: <AlertTriangle size={12} strokeWidth={2.5} />,
    iconColor: 'text-amber-500'
  },
  info: {
    wrapper: 'border-primary/30 dark:border-primary/40',
    iconWrapper: 'bg-primary/10 border border-primary/30',
    icon: <Info size={12} strokeWidth={2.5} />,
    iconColor: 'text-primary'
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
      className={`flex min-w-[300px] max-w-[420px] cursor-pointer items-start gap-3 rounded-xl border bg-card/95 backdrop-blur-md px-4 py-3.5 shadow-elevation-4 transition-all duration-150 hover:shadow-elevation-5 hover:scale-[1.01] active:scale-[0.99] animate-scale-in ${s.wrapper}`}
    >
      <span
        className={`mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${s.iconWrapper} ${s.iconColor}`}
      >
        {s.icon}
      </span>
      <div>
        <p className="m-0 text-[13px] font-semibold text-foreground tracking-tight">{toast.title}</p>
        {toast.description ? (
          <p className="m-0 mt-0.5 text-[12px] text-muted-foreground leading-snug">{toast.description}</p>
        ) : null}
      </div>
    </div>
  )
}
