'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Info } from 'lucide-react'

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

interface InfoTooltipProps {
  /** Contenu du tooltip — texte court ou JSX */
  content: ReactNode
  /** Taille de l'icône Info (défaut: 14) */
  size?: number
  /** Placement préféré du popover (défaut: 'top') */
  placement?: TooltipPlacement
  /** Classe CSS additionnelle sur le conteneur */
  className?: string
  /** Couleur de l'icône (défaut: var(--muted-foreground)) */
  iconColor?: string
}

const PLACEMENTS: Record<TooltipPlacement, string> = {
  top: 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2',
  bottom: 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2',
  left: 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2',
  right: 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2'
}

const ARROWS: Record<TooltipPlacement, string> = {
  top:
    'top-full left-1/2 -translate-x-1/2 border-t-[color:var(--border)] border-l-transparent border-r-transparent border-b-transparent border-[6px]',
  bottom:
    'bottom-full left-1/2 -translate-x-1/2 border-b-[color:var(--border)] border-l-transparent border-r-transparent border-t-transparent border-[6px]',
  left:
    'left-full top-1/2 -translate-y-1/2 border-l-[color:var(--border)] border-t-transparent border-b-transparent border-r-transparent border-[6px]',
  right:
    'right-full top-1/2 -translate-y-1/2 border-r-[color:var(--border)] border-t-transparent border-b-transparent border-l-transparent border-[6px]'
}

/**
 * InfoTooltip — Icône ⓘ vectorielle (Lucide Info) révélant une explication
 * au hover (desktop) ou au clic (mobile/touch).
 *
 * Usage:
 * ```tsx
 * <InfoTooltip content="Code maître de l'entreprise pour rattacher les managers." />
 * ```
 */
export function InfoTooltip({
  content,
  size = 14,
  placement = 'top',
  className = '',
  iconColor
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  // Fermer si clic extérieur
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Fermer avec Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <span
      ref={ref}
      className={`relative inline-flex shrink-0 ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger accessible */}
      <button
        type="button"
        aria-label="Plus d'informations"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="inline-flex cursor-pointer items-center justify-center rounded-full outline-none transition-opacity hover:opacity-100 opacity-70 focus-visible:ring-2 focus-visible:ring-primary/50"
        style={{ color: iconColor ?? 'var(--muted-foreground)', lineHeight: 0 }}
      >
        <Info size={size} strokeWidth={1.8} />
      </button>

      {/* Popover */}
      {open && (
        <span
          role="tooltip"
          className={`
            pointer-events-none absolute z-[9999] w-max max-w-[280px]
            rounded-xl border border-border bg-card px-3.5 py-2.5
            text-[12px] leading-relaxed text-foreground shadow-lg
            animate-in fade-in-0 zoom-in-95 duration-150
            ${PLACEMENTS[placement]}
          `}
          style={{ backdropFilter: 'blur(8px)' }}
        >
          {content}
          {/* Flèche décorative */}
          <span
            aria-hidden
            className={`absolute h-0 w-0 ${ARROWS[placement]}`}
            style={{ borderStyle: 'solid' }}
          />
        </span>
      )}
    </span>
  )
}
