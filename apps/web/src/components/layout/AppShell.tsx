'use client'

import { PropsWithChildren, useEffect, useState } from 'react'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { MobileNav } from './MobileNav'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { colors } from '@/styles/tokens'

export function AppShell({ children }: PropsWithChildren) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <AppHeader />

      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 16px 32px',
        }}
      >
        {mounted && !isDesktop ? (
          <div style={{ paddingTop: 12, marginBottom: 12 }}>
            <MobileNav />
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            minHeight: 'calc(100vh - 60px)',
            gap: 0,
          }}
        >
          {mounted && isDesktop ? <AppSidebar /> : null}

          <main
            style={{
              flex: 1,
              minWidth: 0,
              padding: mounted && isDesktop ? '28px 28px 28px 24px' : '0',
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
