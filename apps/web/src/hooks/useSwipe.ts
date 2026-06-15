'use client'

import { useEffect, useRef } from 'react'

type SwipeDirection = 'left' | 'right' | 'up' | 'down'

interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  /** Minimum distance in pixels to trigger (default: 60) */
  threshold?: number
  /** If true, prevent page scroll on swipe (default: false) */
  preventScroll?: boolean
}

/**
 * Hook to detect swipe gestures on touch devices.
 * Attach the returned ref to any container element.
 */
export function useSwipe<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 60,
  preventScroll = false
}: UseSwipeOptions = {}) {
  const ref = useRef<T>(null)
  const startX = useRef(0)
  const startY = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function handleTouchStart(e: TouchEvent) {
      const touch = e.changedTouches[0]
      if (!touch) return
      startX.current = touch.clientX
      startY.current = touch.clientY
    }

    function handleTouchEnd(e: TouchEvent) {
      const touch = e.changedTouches[0]
      if (!touch) return

      const dx = touch.clientX - startX.current
      const dy = touch.clientY - startY.current
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      // Determine if primarily horizontal or vertical
      if (Math.max(absDx, absDy) < threshold) return

      if (absDx > absDy) {
        // Horizontal swipe
        if (dx < 0 && onSwipeLeft) {
          if (preventScroll) e.preventDefault()
          onSwipeLeft()
        } else if (dx > 0 && onSwipeRight) {
          if (preventScroll) e.preventDefault()
          onSwipeRight()
        }
      } else {
        // Vertical swipe
        if (dy < 0 && onSwipeUp) {
          if (preventScroll) e.preventDefault()
          onSwipeUp()
        } else if (dy > 0 && onSwipeDown) {
          if (preventScroll) e.preventDefault()
          onSwipeDown()
        }
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: !preventScroll })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, preventScroll])

  return ref
}
