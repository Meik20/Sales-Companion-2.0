'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>

function ThemeColorMeta() {
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    const isDark = resolvedTheme === 'dark'
    const color = isDark ? '#0b0f17' : '#ffffff'

    // Met à jour la balise meta theme-color existante ou la crée pour harmoniser la barre de statut mobile
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', color)
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeColorMeta />
      {children}
    </NextThemesProvider>
  )
}

