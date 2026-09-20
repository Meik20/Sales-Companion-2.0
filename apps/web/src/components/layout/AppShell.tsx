'use client'

import { PropsWithChildren, useState } from 'react'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { MobileNav } from './MobileNav'
import { AuthGuard } from '@/components/auth/AuthGuard'

export function AppShell({ children }: PropsWithChildren) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <AuthGuard>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
        <AppHeader onOpenMenuAction={() => setIsDrawerOpen(true)} />

        {isDrawerOpen && (
          <div className="lg:hidden">
            <AppSidebar isMobile={true} onCloseAction={() => setIsDrawerOpen(false)} />
          </div>
        )}

        <div className="relative mx-auto flex w-full flex-1 overflow-hidden lg:max-w-[1440px]">
          <div className="flex h-full w-full overflow-hidden pb-0">
            <div className="hidden lg:block shrink-0">
              <AppSidebar />
            </div>

            <main
              id="main-scroll-container"
              className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden box-border px-4 py-3 pb-[84px] lg:p-7 lg:pl-6 lg:pb-7"
            >
              {children}
            </main>
          </div>

          <div className="block lg:hidden">
            <MobileNav />
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
