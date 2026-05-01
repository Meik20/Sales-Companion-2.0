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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <AppHeader onOpenMenu={() => setIsDrawerOpen(true)} />

      {mounted && !isDesktop && isDrawerOpen && (
        <AppSidebar isMobile={true} onClose={() => setIsDrawerOpen(false)} />
      )}

      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 16px',
        }}
      >

        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            minHeight: 'calc(100vh - 60px)',
            gap: 0,
            paddingBottom: mounted && !isDesktop ? '72px' : '0', // Space for bottom nav
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
        
        {mounted && !isDesktop ? <MobileNav /> : null}
      </div>
    </div>
  )
}
