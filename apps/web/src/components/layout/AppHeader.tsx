'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthActions } from '@/features/auth/hooks/useAuthActions'
import { routes } from '@/constants/routes'
import { ScIcon } from '@/components/ui/ScIcon'
import { Settings, User, LogOut, Menu, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { AdminNotificationBell } from '@/features/admin/components/AdminNotificationBell'

export function AppHeader({ onOpenMenuAction }: { onOpenMenuAction?: () => void }) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { logout } = useAuthActions()
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      setIsProfileOpen(false)
      router.push(routes.login)
    } catch (err) {
      console.error(err)
    }
  }

  const roleBadge: Record<string, { label: string; bg: string }> = {
    admin: { label: t('sidebar.admin'), bg: 'rgba(239,68,68,0.25)' },
    manager: { label: t('sidebar.manager'), bg: 'rgba(251,191,36,0.22)' },
    member: { label: t('sidebar.member'), bg: 'rgba(96,165,250,0.22)' },
    independent: { label: t('sidebar.independent'), bg: 'rgba(34,197,94,0.22)' },
    support_agent: { label: 'Support', bg: 'rgba(235,133,18,0.25)' }
  }
  const badge = user?.role ? (roleBadge[user.role] ?? null) : null

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center border-b border-border/70 bg-background/85 px-4 backdrop-blur-md transition-all">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 640px) {
          .hdr-name-block { display: none !important; }
          .hdr-logo-sub   { display: none !important; }
        }
        @media (min-width: 641px) {
          .hdr-name-block { display: flex !important; }
        }
      `
        }}
      />
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4">
        {/* ── LEFT: Hamburger + Logo ──────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-3.5">
          {onOpenMenuAction && (
            <button
              onClick={onOpenMenuAction}
              className="flex items-center justify-center rounded-lg border border-border/50 bg-secondary/50 p-1.5 text-foreground transition-all hover:bg-secondary"
              aria-label="Ouvrir le menu"
            >
              <Menu size={18} />
            </button>
          )}

          <Link
            href={routes.search}
            className="group flex items-center gap-2.5"
            aria-label="Sales Companion 2.0"
          >
            <ScIcon size={30} className="transition-transform group-hover:scale-105" />
            <div className="flex flex-col leading-[1.1]">
              <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground uppercase">
                Sales <em className="not-italic font-normal opacity-75">Companion</em> <em className="text-[12px] not-italic font-normal opacity-55">2.0</em>
              </span>
              <span className="hdr-logo-sub text-[9.5px] uppercase tracking-[.12em] text-muted-foreground">
                B2B Cameroun
              </span>
            </div>
          </Link>
        </div>

        {/* ── CENTER/RIGHT: Admin notification bell ───────────────────── */}
        <div className="flex flex-1 items-center justify-end gap-2.5">
          {user?.role === 'admin' && <AdminNotificationBell />}

          {/* ── RIGHT: User Profile ──────────────────────────────────── */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-secondary/30 py-1.5 pl-1.5 pr-2.5 text-foreground transition-all hover:bg-secondary/70"
            >
              {/* Avatar */}
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
                {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>

              {/* Name + Role — hidden on mobile */}
              <div className="hdr-name-block flex flex-col text-left leading-[1.2]">
                <span className="text-[13px] font-semibold">
                  {user.name || user.email?.split('@')[0] || t('sidebar.user')}
                </span>
                <div className="mt-[2px] flex items-center gap-1.5">
                  {badge && (
                    <span
                      style={{ backgroundColor: badge.bg }}
                      className="rounded-full px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-[.06em] text-foreground"
                    >
                      {badge.label}
                    </span>
                  )}
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {(user.plan || 'free') === 'free' ? t('header.planFree') : user.plan}
                  </span>
                </div>
              </div>

              <ChevronDown
                size={14}
                className={`shrink-0 opacity-60 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : 'rotate-0'}`}
              />
            </button>

            {/* Dropdown */}
            {isProfileOpen && (
              <>
                <div
                  onClick={() => setIsProfileOpen(false)}
                  className="fixed inset-0 z-[99]"
                />
                <div className="absolute right-0 top-[46px] z-[200] flex w-[220px] animate-in fade-in zoom-in-95 flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-md duration-150">
                  {/* User Info */}
                  <div className="border-b border-border px-4 pb-3 pt-3.5">
                    <div className="text-[14px] font-semibold text-foreground">
                      {user.name || t('sidebar.user')}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {user.email}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="flex flex-col gap-0.5 p-1.5">
                    {[
                      {
                        icon: User,
                        label: t('header.myProfile'),
                        action: () => {
                          setIsProfileOpen(false)
                          router.push(routes.profile)
                        }
                      },
                      {
                        icon: Settings,
                        label: t('header.settings'),
                        action: () => {
                          setIsProfileOpen(false)
                          router.push(routes.settings)
                        }
                      }
                    ].map(({ icon: Icon, label, action }) => (
                      <button
                        key={label}
                        onClick={action}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-all hover:bg-secondary"
                      >
                        <Icon size={15} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
                        {label}
                      </button>
                    ))}

                    <div className="my-1 border-t border-border" />

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-destructive transition-all hover:bg-destructive/10"
                    >
                      <LogOut size={15} strokeWidth={1.8} className="shrink-0" />
                      {t('header.logout')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(routes.login)}
          >
            {t('header.login')}
          </Button>
        )}
        </div>{/* ← fermeture du wrapper bell + profile */}
      </div>
    </header>
  )
}
