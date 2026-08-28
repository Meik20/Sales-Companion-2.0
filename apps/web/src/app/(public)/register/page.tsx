import { Suspense } from 'react'
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
      <Suspense
        fallback={
          <div className="flex min-h-[300px] w-full max-w-[460px] items-center justify-center rounded-[20px] border border-border bg-card p-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </main>
  )
}
