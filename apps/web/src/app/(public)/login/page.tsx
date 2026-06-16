// apps/web/src/app/(public)/login/page.tsx
import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/components/LoginForm'

export const metadata: Metadata = {
  title: 'Connexion',
  description:
    'Connectez-vous à Sales Companion 2.0 pour accéder à votre pipeline commercial et gérer votre prospection B2B au Cameroun.',
  alternates: { canonical: '/login' },
  robots: { index: true, follow: true }
}

export default function LoginPage() {
  return (
    <main className="auth-page">
      <LoginForm />
    </main>
  )
}
