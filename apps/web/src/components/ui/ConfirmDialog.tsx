'use client'

import React, { useEffect, useCallback } from 'react'
import { AlertTriangle, Trash2, AlertCircle, X, Loader2 } from 'lucide-react'

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info'

export type ConfirmDialogProps = {
  isOpen: boolean
  title: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmDialogVariant
  isLoading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

const variantConfig: Record<
  ConfirmDialogVariant,
  {
    icon: typeof Trash2
    iconColor: string
    iconBg: string
    confirmBg: string
    confirmBorder: string
    confirmText: string
    glowColor: string
  }
> = {
  danger: {
    icon: Trash2,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-500/10 border-red-500/25',
    confirmBg: 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-red-500/25',
    confirmBorder: 'border-red-600',
    confirmText: 'Supprimer',
    glowColor: 'rgba(239, 68, 68, 0.15)'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-500/10 border-amber-500/25',
    confirmBg: 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-500/25',
    confirmBorder: 'border-amber-600',
    confirmText: 'Confirmer',
    glowColor: 'rgba(245, 158, 11, 0.15)'
  },
  info: {
    icon: AlertCircle,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10 border-blue-500/25',
    confirmBg: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-blue-500/25',
    confirmBorder: 'border-blue-600',
    confirmText: 'Valider',
    glowColor: 'rgba(59, 130, 246, 0.15)'
  }
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText,
  cancelText = 'Annuler',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const config = variantConfig[variant] || variantConfig.danger
  const Icon = config.icon

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel()
      }
    },
    [isLoading, onCancel]
  )

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      // Prevent background scrolling
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isLoading) onCancel()
        }}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200"
        style={{
          boxShadow: `0 20px 40px -15px ${config.glowColor}, 0 0 0 1px var(--border)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow at the top */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-36 w-72 -translate-x-1/2 rounded-full blur-3xl opacity-40"
          style={{ background: config.glowColor }}
        />

        {/* Close Button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          {/* Icon Badge */}
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${config.iconBg} ${config.iconColor}`}
          >
            <Icon size={20} />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-4">
            <h3
              id="confirm-dialog-title"
              className="text-base font-bold text-foreground leading-snug"
            >
              {title}
            </h3>
            {description && (
              <div className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                {description}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border/80 bg-secondary/50 hover:bg-secondary text-foreground hover:text-foreground transition-all duration-150 disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl shadow-md transition-all duration-150 disabled:opacity-60 cursor-pointer ${config.confirmBg}`}
          >
            {isLoading && <Loader2 size={13} className="animate-spin" />}
            <span>{confirmText || config.confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
