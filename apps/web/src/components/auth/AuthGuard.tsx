'use client'

import { PropsWithChildren, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors } from '@/styles/tokens'

export function AuthGuard({ children }: PropsWithChildren) {
  const { user, loading } = useCurrentUser()

  useEffect(() => {
    if (!loading && !user) {
      // Shared link opened in a new tab, or any unauthenticated access
      // → always send to the landing page
      window.location.replace('/landing.html')
    }
  }, [user, loading])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          color: colors.textMid,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: colors.greenMid,
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ margin: 0, fontSize: 14 }}>Chargement…</p>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
