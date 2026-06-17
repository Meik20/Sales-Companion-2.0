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
            maxWidth: mounted && isDesktop ? 1440 : '100%',
            margin: mounted && isDesktop ? '0 auto' : '0',
            position: 'relative'
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              paddingBottom: 0
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
                overflowX: 'hidden',
                padding: mounted && isDesktop ? '28px 28px 28px 24px' : '12px 16px',
                paddingBottom: mounted && !isDesktop ? '84px' : (mounted && isDesktop ? '28px' : '16px'),
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
