'use client'

import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  const [coords, setCoords] = useState<{ top: number; left: number; arrowLeft?: number } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLSpanElement>(null)

  // Calcul de position fixe via Portal pour éviter tout rognage par un overflow:hidden parent
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setCoords(null)
      return
    }

    const updatePosition = () => {
      if (!triggerRef.current) return
      const tRect = triggerRef.current.getBoundingClientRect()
      const pRect = popoverRef.current?.getBoundingClientRect()
      const popW = pRect?.width ?? 260
      const popH = pRect?.height ?? 64
      const gap = 8
      const padding = 12

      let nextPlacement = preferredPlacement
      if (preferredPlacement === 'left' && tRect.left < popW + padding) {
        nextPlacement = window.innerWidth - tRect.right >= popW + padding ? 'right' : 'top'
      } else if (preferredPlacement === 'right' && window.innerWidth - tRect.right < popW + padding) {
        nextPlacement = tRect.left >= popW + padding ? 'left' : 'top'
      }
      if (nextPlacement === 'top' && tRect.top < popH + gap + padding) {
        nextPlacement = 'bottom'
      } else if (nextPlacement === 'bottom' && window.innerHeight - tRect.bottom < popH + gap + padding) {
        nextPlacement = 'top'
      }

      const triggerCenterX = tRect.left + tRect.width / 2
      const triggerCenterY = tRect.top + tRect.height / 2

      let top = 0
      let left = 0
      let arrowLeft: number | undefined

      if (nextPlacement === 'top' || nextPlacement === 'bottom') {
        top = nextPlacement === 'top' ? tRect.top - popH - gap : tRect.bottom + gap
        const idealLeft = triggerCenterX - popW / 2
        left = Math.max(padding, Math.min(idealLeft, window.innerWidth - popW - padding))
        arrowLeft = Math.max(12, Math.min(triggerCenterX - left, popW - 12))
      } else if (nextPlacement === 'left') {
        left = Math.max(padding, tRect.left - popW - gap)
        top = Math.max(padding, Math.min(triggerCenterY - popH / 2, window.innerHeight - popH - padding))
      } else {
        left = Math.min(window.innerWidth - popW - padding, tRect.right + gap)
        top = Math.max(padding, Math.min(triggerCenterY - popH / 2, window.innerHeight - popH - padding))
      }

      setEffectivePlacement(nextPlacement)
      setCoords({ top, left, arrowLeft })
    }

    updatePosition()
    // Recalculer au frame suivant une fois que popoverRef est mesuré
    const raf = requestAnimationFrame(updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, preferredPlacement])

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

  const ARROWS: Record<TooltipPlacement, string> = {
    top:
      'top-full -translate-x-1/2 border-t-[color:var(--border)] border-l-transparent border-r-transparent border-b-transparent border-[6px]',
    bottom:
      'bottom-full -translate-x-1/2 border-b-[color:var(--border)] border-l-transparent border-r-transparent border-t-transparent border-[6px]',
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

      {/* Popover rendu en Portal fixed pour éviter tout rognage */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            ref={popoverRef}
            role="tooltip"
            className="pointer-events-none fixed z-[9999] w-max max-w-[280px] rounded-xl border border-border bg-card px-3.5 py-2.5 text-[12px] leading-relaxed text-foreground shadow-lg"
            style={{
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              opacity: coords ? 1 : 0,
              backgroundColor: 'var(--card)'
            }}
          >
            {content}
            <span
              aria-hidden
              className={`absolute h-0 w-0 ${ARROWS[effectivePlacement]}`}
              style={{
                borderStyle: 'solid',
                left: coords?.arrowLeft !== undefined ? `${coords.arrowLeft}px` : undefined
              }}
            />
          </span>,
          document.body
        )}
    </span>
  )
}
