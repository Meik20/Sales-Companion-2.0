'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthActions } from '@/features/auth/hooks/useAuthActions'
import { routes } from '@/constants/routes'
import { ScIcon } from '@/components/ui/ScIcon'
import { Settings, User, LogOut, Menu, WifiOff } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { AdminNotificationBell } from '@/features/admin/components/AdminNotificationBell'
import { UserNotificationBell } from '@/components/layout/UserNotificationBell'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useProspectingCountry } from '@/hooks/useProspectingCountry'
import { getCountryName } from '@sales-companion/shared'
import { DEPLOYMENT_CONFIG } from '@/lib/deployment-config'
import { getRoleDisplayLabel, getRoleBadgeStyle } from '@/lib/role-labels'

function getUserInitials(user?: { name?: string | null; email?: string | null } | null): string {
  if (!user) return '?'
  const name = user.name?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    const first = parts[0]
    const second = parts[1]
    if (first && second) {
      return (first.charAt(0) + second.charAt(0)).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (user.email) {
    return user.email.slice(0, 2).toUpperCase()
  }
  return '?'
}

export function AppHeader({ onOpenMenuAction }: { onOpenMenuAction?: () => void }) {
  const { t, lang } = useTranslation()
  const { isOnline } = useNetworkStatus()
  const { user } = useCurrentUser()
  const { logout } = useAuthActions()
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const prospectingCountry = useProspectingCountry()
  const countryLabel = getCountryName(prospectingCountry, lang)

  const handleLogout = async () => {
    try {
      await logout()
      setIsProfileOpen(false)
      router.push(routes.login)
    } catch (err) {
      console.error(err)
    }
  }

  // Résolution canonique officielle du badge de rôle (role-labels.ts)
  const badge = user?.role
    ? {
        label: getRoleDisplayLabel({
          role: user.role,
          orgRole: user.orgRole,
          lang,
          customRoleLabel: user.customRoleLabel
        }),
        bg: getRoleBadgeStyle(user.role, user.orgRole).bg
      }
    : null

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-card px-4 shadow-sm transition-all"
      style={{
        backgroundColor: 'var(--card, #ffffff)',
        opacity: 1
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 640px) {
          .hdr-logo-sub { display: none !important; }
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
              className="flex lg:hidden items-center justify-center rounded-lg border border-border/60 bg-secondary/40 p-1.5 text-foreground transition-all duration-150 hover:bg-secondary hover:shadow-elevation-1 cursor-pointer"
              aria-label="Ouvrir le menu"
            >
              <Menu size={18} />
            </button>
          )}

          <Link
            href={user?.role === 'support_agent' ? routes.crm : routes.search}
            className="group flex items-center gap-2.5"
            aria-label="Sales Companion 2.0"
          >
            <ScIcon size={30} className="transition-transform group-hover:scale-105" />
            <div className="flex flex-col leading-[1.1]">
              <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground uppercase">
                Sales <em className="not-italic font-normal opacity-75">Companion</em>{' '}
                <em className="text-[12px] not-italic font-normal opacity-55">2.0</em>
              </span>
              {DEPLOYMENT_CONFIG.isEnterprise && DEPLOYMENT_CONFIG.enterpriseName ? (
                <span className="hdr-logo-sub text-[9.5px] uppercase tracking-[.15em] font-semibold text-primary">
                  {DEPLOYMENT_CONFIG.enterpriseName}
                </span>
              ) : (
                <span className="hdr-logo-sub text-[9.5px] uppercase tracking-[.15em] font-medium text-muted-foreground">
                  {countryLabel}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* ── CENTER/RIGHT: Admin bell + Offline Voyant ─────── */}
        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-2.5">
          {!isOnline && (
            <div
              className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 sm:px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 shadow-elevation-1 animate-pulse shrink-0"
              title="Application en mode hors connexion : l'appareil est hors ligne ou manque de data. Données en cache local actives."
            >
              <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] shrink-0" />
              <WifiOff size={13} strokeWidth={2.2} className="shrink-0" />
              <span className="hidden sm:inline">Hors ligne</span>
            </div>
          )}

          {user?.role === 'admin' ? (
            <AdminNotificationBell />
          ) : user ? (
            <UserNotificationBell />
          ) : null}

          {/* ── RIGHT: User Profile ──────────────────────────────────── */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="group relative flex items-center justify-center rounded-full transition-transform duration-150 hover:scale-105 active:scale-95 focus:outline-hidden cursor-pointer"
                aria-label={t('header.myProfile') || 'Menu profil utilisateur'}
                aria-expanded={isProfileOpen}
              >
                {/* Avatar avec initiales */}
                <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full border-2 border-primary/60 bg-primary/20 text-[13px] font-bold text-primary shadow-elevation-1 ring-2 ring-primary/15 transition-all duration-150 group-hover:border-primary group-hover:ring-primary/30 dark:border-primary/70 dark:bg-primary/25">
                  {getUserInitials(user)}
                </div>
              </button>

              {/* Dropdown */}
              {isProfileOpen && (
                <>
                  <div onClick={() => setIsProfileOpen(false)} className="fixed inset-0 z-[99]" />
                  <div
                    style={{
                      backgroundColor: 'var(--card, #ffffff)',
                      boxShadow: '0 16px 36px -6px rgba(0,0,0,0.25), 0 0 0 1px var(--border)'
                    }}
                    className="popover-panel absolute right-0 top-[48px] z-[200] flex w-[260px] animate-scale-in flex-col overflow-hidden rounded-xl border border-border"
                  >
                    {/* User Info Header */}
                    <div
                      className="border-b border-border p-3.5"
                      style={{ backgroundColor: 'var(--secondary, #f8fafc)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/60 bg-primary/20 text-[14px] font-bold text-primary shadow-elevation-1 ring-2 ring-primary/15 dark:border-primary/70 dark:bg-primary/25">
                          {getUserInitials(user)}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13.5px] font-semibold text-foreground">
                            {user.name || t('sidebar.user')}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </div>

                      {/* Statut (SM, TM, Commercial, etc.) et Plan Actif */}
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        {badge && (
                          <span
                            style={{ backgroundColor: badge.bg }}
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.06em] text-foreground border border-border/40"
                          >
                            {badge.label}
                          </span>
                        )}
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.06em] bg-primary/10 text-primary border border-primary/25">
                          {(user.plan || 'free') === 'free' ? t('header.planFree') : user.plan}
                        </span>
                      </div>

                      {/* Segment Commercial */}
                      {(user.displaySegment || user.segment) && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground/70 uppercase tracking-wider text-[10px]">Segment :</span>
                          <span className="font-bold text-foreground">
                            {user.displaySegment || (user.zone ? `${user.segment} (${user.zone})` : user.segment)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div
                      className="flex flex-col gap-0.5 p-1.5"
                      style={{ backgroundColor: 'var(--card, #ffffff)' }}
                    >
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
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-all hover:bg-secondary cursor-pointer"
                        >
                          <Icon
                            size={15}
                            strokeWidth={1.8}
                            className="shrink-0 text-muted-foreground"
                          />
                          {label}
                        </button>
                      ))}

                      <div className="my-1 border-t border-border" />

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-destructive transition-all hover:bg-destructive/10 cursor-pointer"
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
            <Button variant="outline" size="sm" onClick={() => router.push(routes.login)}>
              {t('header.login')}
            </Button>
          )}
        </div>
        {/* ← fermeture du wrapper bell + profile */}
      </div>
    </header>
  )
}
