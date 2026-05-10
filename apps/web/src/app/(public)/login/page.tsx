// apps/web/src/app/(public)/login/page.tsx
import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { colors } from '@/styles/tokens'

export const metadata: Metadata = {
  title: 'Connexion',
  description:
    'Connectez-vous à Sales Companion 2.0 pour accéder à votre pipeline commercial et gérer votre prospection B2B au Cameroun.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false }, // page auth — pas d'indexation
}


export default function LoginPage() {
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
      {/* Background glow */}
      <div
        style={{
          position: 'fixed',
          top: '-200px',
          left: '-200px',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(27,122,62,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <LoginForm />
      </div>
    </main>
  )
}
