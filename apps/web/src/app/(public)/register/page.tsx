import type { Metadata } from 'next'
import { RegisterForm } from '@/features/auth/components/RegisterForm'

export const metadata: Metadata = {
  title: 'Créer un compte',
  description:
    'Créez votre compte Sales Companion 2.0 gratuitement. Rejoignez les équipes commerciales et managers qui boostent leur prospection B2B au Cameroun.',
  alternates: { canonical: '/register' },
  robots: { index: true, follow: true }
}

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <RegisterForm />
    </main>
  )
}
