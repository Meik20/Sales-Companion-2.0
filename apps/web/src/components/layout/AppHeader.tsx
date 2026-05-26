'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthActions } from '@/features/auth/hooks/useAuthActions'
import { routes } from '@/constants/routes'
import { colors, shadows } from '@/styles/tokens'
import { ScIcon } from '@/components/ui/ScIcon'
import { Settings, User, LogOut, Menu, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'

export function AppHeader({ onOpenMenu }: { onOpenMenu?: () => void }) {
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
    independent: { label: t('sidebar.independent'), bg: 'rgba(34,197,94,0.22)' }
  }
  const badge = user?.role ? (roleBadge[user.role] ?? null) : null

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: `var(--color-primary)`,
        boxShadow: shadows.sm,
        padding: '0 12px',
        height: 60,
        display: 'flex',
        alignItems: 'center'
      }}
    >
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
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}
      >
        {/* ── LEFT: Hamburger + Logo ──────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                transition: 'all 200ms ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              aria-label="Ouvrir le menu"
            >
              <Menu size={18} />
            </button>
          )}

          <Link
            href={routes.search}
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          >
            <ScIcon size={30} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span
                style={{
                  fontFamily: 'inherit',
                  fontWeight: 800,
                  fontSize: 15,
                  color: '#ffffff',
                  letterSpacing: '.05em',
                  textTransform: 'uppercase'
                }}
              >
                Sales{' '}
                <em style={{ opacity: 0.75, fontStyle: 'normal', fontWeight: 400 }}>Companion</em>{' '}
                <em style={{ opacity: 0.55, fontStyle: 'normal', fontWeight: 400, fontSize: 12 }}>
                  2.0
                </em>
              </span>
              <span
                className="hdr-logo-sub"
                style={{
                  fontSize: 9.5,
                  color: 'rgba(255,255,255,0.55)',
                  letterSpacing: '.12em',
                  textTransform: 'uppercase'
                }}
              >
                B2B Cameroun
              </span>
            </div>
          </Link>
        </div>

        {/* ── RIGHT: User Profile ──────────────────────────────────── */}
        {user ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 10,
                padding: '6px 10px 6px 6px',
                cursor: 'pointer',
                color: '#fff',
                transition: 'all 200ms ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0
                }}
              >
                {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>

              {/* Name + Role — hidden on mobile */}
              <div
                className="hdr-name-block"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'left',
                  lineHeight: 1.2
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {user.name || user.email?.split('@')[0] || t('sidebar.user')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                  {badge && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 9999,
                        background: badge.bg,
                        color: '#fff',
                        letterSpacing: '.06em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {badge.label}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.55)',
                      textTransform: 'uppercase'
                    }}
                  >
                    {(user.plan || 'free') === 'free' ? t('header.planFree') : user.plan}
                  </span>
                </div>
              </div>

              <ChevronDown
                size={14}
                style={{
                  opacity: 0.6,
                  transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms ease',
                  flexShrink: 0
                }}
              />
            </button>

            {/* Dropdown */}
            {isProfileOpen && (
              <>
                <div
                  onClick={() => setIsProfileOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 46,
                    right: 0,
                    width: 220,
                    background: colors.bg,
                    borderRadius: 12,
                    boxShadow: shadows.md,
                    border: `1px solid ${colors.border}`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 200,
                    animation: 'fadeIn 150ms ease'
                  }}
                >
                  {/* User Info */}
                  <div
                    style={{
                      padding: '14px 16px 12px',
                      borderBottom: `1px solid ${colors.border}`
                    }}
                  >
                    <div style={{ fontWeight: 600, color: colors.text, fontSize: 14 }}>
                      {user.name || t('sidebar.user')}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMid, marginTop: 2 }}>
                      {user.email}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div
                    style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}
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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          padding: '8px 10px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 13,
                          cursor: 'pointer',
                          color: colors.text,
                          transition: 'all 150ms ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = colors.hoverBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Icon
                          size={15}
                          strokeWidth={1.8}
                          style={{ color: colors.textMid, flexShrink: 0 }}
                        />
                        {label}
                      </button>
                    ))}

                    <div style={{ borderTop: `1px solid ${colors.border}`, margin: '4px 0' }} />

                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '8px 10px',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        cursor: 'pointer',
                        color: colors.danger,
                        fontWeight: 500,
                        transition: 'all 150ms ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = colors.dangerBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LogOut size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
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
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
          >
            {t('header.login')}
          </Button>
        )}
      </div>
    </header>
  )
}
