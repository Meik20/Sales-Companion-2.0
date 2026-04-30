'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ActivateMemberForm } from '@/features/team/components/ActivateMemberForm'
import { ScIcon } from '@/components/ui/ScIcon'
import { colors } from '@/styles/tokens'
import { routes } from '@/constants/routes'

export default function ActivatePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const accessId = searchParams.get('accessId') ?? ''
  const [done, setDone] = useState(false)

  if (!accessId) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          color: colors.textMid,
          textAlign: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 40 }}>⚠️</span>
        <p style={{ fontSize: 15 }}>Lien d&apos;activation invalide ou manquant.</p>
      </main>
    )
  }

  if (done) {
    setTimeout(() => router.replace(routes.login), 2000)
    return (
      <main
        style={{
          minHeight: '100vh',
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          color: colors.text,
        }}
      >
        <span style={{ fontSize: 40 }}>✓</span>
        <p style={{ fontSize: 15, fontWeight: 600 }}>Compte activé ! Redirection en cours…</p>
      </main>
    )
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          background: colors.bg2,
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          padding: 40,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <ScIcon size={48} style={{ marginBottom: 14 }} />
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: colors.text, fontFamily: "'Syne',sans-serif" }}>
            Activer mon compte
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>
            Créez votre mot de passe pour accéder à Sales Companion.
          </p>
        </div>

        <ActivateMemberForm accessId={accessId} onSuccess={() => setDone(true)} />
      </div>
    </main>
  )
}
