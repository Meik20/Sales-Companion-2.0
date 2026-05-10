import type { Metadata } from 'next'
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { colors } from '@/styles/tokens'

export const metadata: Metadata = {
  title: 'Créer un compte',
  description:
    'Créez votre compte Sales Companion 2.0 gratuitement. Rejoignez les équipes commerciales et managers qui boostent leur prospection B2B au Cameroun.',
  alternates: { canonical: '/register' },
  robots: { index: true, follow: true },
}


export default function RegisterPage() {
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
          position: 'fixed',
          top: '-200px',
          right: '-200px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(27,122,62,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <RegisterForm />
      </div>
    </main>
  )
}
