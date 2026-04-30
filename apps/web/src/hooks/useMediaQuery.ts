'use client'

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Set mounted flag first to avoid hydration mismatch
    setMounted(true)
    
    const mediaQuery = window.matchMedia(query)
    
    const handleChange = () => {
      setMatches(mediaQuery.matches)
    }

    // Set initial value
    setMatches(mediaQuery.matches)

    // Add listener
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  // Don't render dynamic content until mounted to avoid hydration mismatch
  return mounted ? matches : false
}
