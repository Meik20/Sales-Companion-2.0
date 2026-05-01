'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ScIcon } from '@/components/ui/ScIcon'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { routes } from '@/constants/routes'
import { colors, shadows } from '@/styles/tokens'

export function AppHeader({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { user } = useCurrentUser()
  const router = useRouter()

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
            href={routes.home}
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

        {/* Right: Avatar */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {user ? (
            <button
              onClick={onOpenMenu}
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
              }}
            >
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '👤'}
            </button>
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
