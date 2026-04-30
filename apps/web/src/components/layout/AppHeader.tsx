'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { ScIcon } from '@/components/ui/ScIcon'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { routes } from '@/constants/routes'
import { useAuthActions } from '@/features/auth/hooks/useAuthActions'
import { useToast } from '@/hooks/useToast'
import { colors } from '@/styles/tokens'

const roleBadge: Record<string, 'success' | 'gold' | 'info' | 'default'> = {
  admin: 'gold',
  manager: 'success',
  member: 'info',
  independent: 'default',
}

export function AppHeader() {
  const { user } = useCurrentUser()
  const { logout } = useAuthActions()
  const { pushToast } = useToast()

  async function handleLogout() {
    try {
      await logout()
      pushToast({ type: 'success', title: 'Déconnexion réussie' })
    } catch {
      pushToast({ type: 'error', title: 'Erreur de déconnexion' })
    }
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(13,17,23,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${colors.border}`,
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
        {/* Brand */}
        <Link
          href={routes.home}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <ScIcon size={32} interactive />
          <span
            style={{
              fontFamily: "'Syne',sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: colors.text,
              letterSpacing: '.02em',
            }}
          >
            Sales{' '}
            <em style={{ color: colors.greenMid, fontStyle: 'normal' }}>Companion</em>
          </span>
        </Link>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <span style={{ fontSize: 13, color: colors.textMid }}>
                {user.name || user.email || 'Utilisateur'}
              </span>
              {user.role ? (
                <Badge variant={roleBadge[user.role] ?? 'default'}>
                  {user.role}
                </Badge>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
                Déconnexion
              </Button>
            </>
          ) : (
            <>
              <Link
                href={routes.login}
                style={{ fontSize: 13, color: colors.textMid, fontWeight: 500 }}
              >
                Connexion
              </Link>
              <Button variant="primary" size="sm" as="a" href={routes.register}>
                Commencer
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
