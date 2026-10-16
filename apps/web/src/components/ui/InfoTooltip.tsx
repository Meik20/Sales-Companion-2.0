'use client'

import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react'
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

/**
 * InfoTooltip — Icône ⓘ vectorielle (Lucide Info) révélant une explication
 * au hover (desktop) ou au clic (mobile/touch).
 *
 * Intègre un mécanisme auto-ajustable pour éviter tout débordement hors écran (viewport boundary guard).
 */
export function InfoTooltip({
  content,
  size = 14,
  placement: preferredPlacement = 'top',
  className = '',
  iconColor
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const [effectivePlacement, setEffectivePlacement] = useState<TooltipPlacement>(preferredPlacement)
  const [horizontalShift, setHorizontalShift] = useState(0)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLSpanElement>(null)

  // Ajustement automatique en cas de collision avec les bords de l'écran
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    let nextPlacement = preferredPlacement

    // 1. Détection de collision latérale pour le placement 'left'
    if (preferredPlacement === 'left' && triggerRect.left < 260) {
      // Trop proche du bord gauche (ex: sidebar) -> bascule à droite ou en haut
      nextPlacement = window.innerWidth - triggerRect.right >= 260 ? 'right' : 'top'
    } else if (preferredPlacement === 'right' && window.innerWidth - triggerRect.right < 260) {
      nextPlacement = triggerRect.left >= 260 ? 'left' : 'top'
    }

    // 2. Détection de collision verticale pour le placement 'top'
    if (nextPlacement === 'top' && triggerRect.top < 80) {
      nextPlacement = 'bottom'
    }

    setEffectivePlacement(nextPlacement)
  }, [open, preferredPlacement])

  // Ajustement fin du décalage horizontal pour empêcher tout masquage par les bords d'écran
  useEffect(() => {
    if (!open || !popoverRef.current) return

    const popoverRect = popoverRef.current.getBoundingClientRect()
    const padding = 12

    if (popoverRect.left < padding) {
      // Déborde à gauche : décaler vers la droite
      setHorizontalShift(padding - popoverRect.left)
    } else if (popoverRect.right > window.innerWidth - padding) {
      // Déborde à droite : décaler vers la gauche
      setHorizontalShift(window.innerWidth - padding - popoverRect.right)
    } else {
      setHorizontalShift(0)
    }
  }, [open, effectivePlacement])

  // Fermer si clic extérieur
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
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

  return (
    <span
      ref={triggerRef}
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

      {/* Popover auto-ajustable */}
      {open && (
        <span
          ref={popoverRef}
          role="tooltip"
          className={`
            pointer-events-none absolute z-[9999] w-max max-w-[280px]
            rounded-xl border border-border bg-card px-3.5 py-2.5
            text-[12px] leading-relaxed text-foreground shadow-lg
            animate-in fade-in-0 zoom-in-95 duration-150
            ${PLACEMENTS[effectivePlacement]}
          `}
          style={{
            backdropFilter: 'blur(8px)',
            transform: horizontalShift !== 0 ? `translateX(calc(-50% + ${horizontalShift}px))` : undefined
          }}
        >
          {content}
          {/* Flèche décorative */}
          <span
            aria-hidden
            className={`absolute h-0 w-0 ${ARROWS[effectivePlacement]}`}
            style={{
              borderStyle: 'solid',
              transform: horizontalShift !== 0 ? `translateX(calc(-50% - ${horizontalShift}px))` : undefined
            }}
          />
        </span>
      )}
    </span>
  )
}
