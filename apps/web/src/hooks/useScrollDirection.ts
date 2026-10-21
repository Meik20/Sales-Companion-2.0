'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface UseScrollDirectionOptions {
  containerId?: string
  threshold?: number
  topThreshold?: number
}

/**
 * Hook to detect scroll direction on mobile to auto-hide / auto-show the navigation bar.
 * - Scrolling DOWN beyond `threshold` => hides navigation (returns isVisible: false)
 * - Scrolling UP beyond `threshold` => shows navigation (returns isVisible: true)
 * - Near the top of the container (`< topThreshold`) => always visible
 * - Route change (`pathname`) => always visible
 * - Input/Textarea focus on mobile => hides to prevent virtual keyboard overlap
 */
export function useScrollDirection({
  containerId = 'main-scroll-container',
  threshold = 24,
  topThreshold = 30,
}: UseScrollDirectionOptions = {}) {
  const [isVisible, setIsVisible] = useState(true)
  const pathname = usePathname()
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  // Reset visibility when route changes
  useEffect(() => {
    setIsVisible(true)
    lastScrollY.current = 0
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const getScrollTop = (target: HTMLElement | Window | null): number => {
      if (!target) return 0
      if (target instanceof Window) {
        return window.scrollY || document.documentElement.scrollTop || 0
      }
      return target.scrollTop || 0
    }

    const container = document.getElementById(containerId)
    const targetElement: HTMLElement | Window = container || window

    const updateScrollDir = () => {
      const currentScrollY = getScrollTop(targetElement)
      const diff = currentScrollY - lastScrollY.current

      // Always show when near the very top
      if (currentScrollY <= topThreshold) {
        setIsVisible(true)
        lastScrollY.current = currentScrollY
        ticking.current = false
        return
      }

      // Check threshold before changing state to avoid flickering
      if (Math.abs(diff) >= threshold) {
        if (diff > 0) {
          // Scrolling down -> hide nav
          setIsVisible(false)
        } else {
          // Scrolling up -> show nav
          setIsVisible(true)
        }
        lastScrollY.current = currentScrollY
      }

      ticking.current = false
    }

    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDir)
        ticking.current = true
      }
    }

    // Hide mobile nav when typing in an input/textarea to prevent keyboard collision
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        setIsVisible(false)
      }
    }

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        setIsVisible(true)
      }
    }

    targetElement.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('focusin', handleFocusIn)
    window.addEventListener('focusout', handleFocusOut)

    return () => {
      targetElement.removeEventListener('scroll', onScroll)
      window.removeEventListener('focusin', handleFocusIn)
      window.removeEventListener('focusout', handleFocusOut)
    }
  }, [containerId, threshold, topThreshold])

  return isVisible
}
