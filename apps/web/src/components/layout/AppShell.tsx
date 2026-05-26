'use client'

import { PropsWithChildren, useEffect, useState } from 'react'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { MobileNav } from './MobileNav'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { colors } from '@/styles/tokens'
import { AuthGuard } from '@/components/auth/AuthGuard'

export function AppShell({ children }: PropsWithChildren) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [mounted, setMounted] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <AuthGuard>
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: colors.bg
        }}
      >
        <AppHeader onOpenMenu={() => setIsDrawerOpen(true)} />

        {mounted && !isDesktop && isDrawerOpen && (
          <AppSidebar isMobile={true} onClose={() => setIsDrawerOpen(false)} />
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            width: '100%',
            maxWidth: 1440,
            margin: '0 auto',
            position: 'relative'
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              paddingBottom: mounted && !isDesktop ? '72px' : '0'
            }}
          >
            {mounted && isDesktop ? <AppSidebar /> : null}

            <main
              id="main-scroll-container"
              style={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                overflowY: 'auto',
                padding: mounted && isDesktop ? '28px 28px 28px 24px' : '12px 16px 16px',
                boxSizing: 'border-box'
              }}
            >
              {children}
            </main>
          </div>

          {mounted && !isDesktop ? <MobileNav /> : null}
        </div>
      </div>
    </AuthGuard>
  )
}
