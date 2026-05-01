'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ScIcon } from '@/components/ui/ScIcon'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthActions } from '@/features/auth/hooks/useAuthActions'
import { routes } from '@/constants/routes'
import { colors, shadows } from '@/styles/tokens'

export function AppHeader({ onOpenMenu }: { onOpenMenu?: () => void }) {
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

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: `linear-gradient(135deg, ${colors.green} 0%, ${colors.greenDark} 100%)`,
        boxShadow: shadows.sm,
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Left: Menu & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
              }}
              aria-label="Ouvrir le menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          )}

          <Link
            href={routes.search}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
            }}
          >
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: 4, borderRadius: 8 }}>
              <ScIcon size={24} interactive />
            </div>
            <span
              style={{
                fontFamily: "'Syne',sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: '#ffffff',
                letterSpacing: '.02em',
                textTransform: 'uppercase',
              }}
            >
              Sales <em style={{ opacity: 0.9, fontStyle: 'normal', fontWeight: 400 }}>Companion</em>
            </span>
          </Link>
        </div>

        {/* Right: Avatar & Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          {user ? (
            <>
              {/* Avatar + role badge grouped together */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                >
                  {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '👤'}
                </button>

                {user.role === 'admin' && (
                  <div style={{
                    background: 'rgba(255,255,255,0.25)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    padding: '3px 9px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.06em',
                    lineHeight: 1,
                  }}>
                    ADMIN
                  </div>
                )}

                {user.role === 'manager' && (
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '3px 9px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.06em',
                    lineHeight: 1,
                  }}>
                    MANAGER
                  </div>
                )}
              </div>

              {/* Menu Déroulant Profil */}
              {isProfileOpen && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 50,
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
                  <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${colors.border}` }}>
                    <div style={{ fontWeight: 600, color: colors.text, fontSize: 14 }}>{user.name || 'Utilisateur'}</div>
                    <div style={{ fontSize: 12, color: colors.textMid, marginTop: 2 }}>{user.email}</div>
                  </div>
                  <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button 
                      onClick={() => { setIsProfileOpen(false); router.push(routes.profile) }}
                      style={{ padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: colors.text }}
                    >
                      👤 Mon Profil
                    </button>
                    <button 
                      onClick={() => { setIsProfileOpen(false); router.push(routes.settings) }}
                      style={{ padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: colors.text }}
                    >
                      ⚙️ Paramètres
                    </button>
                    <button 
                      onClick={handleLogout}
                      style={{ padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: colors.danger, fontWeight: 500, marginTop: 4 }}
                    >
                      🚪 Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => router.push(routes.login)} style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
              Connexion
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
