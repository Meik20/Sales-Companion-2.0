'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { ScIcon } from '@/components/ui/ScIcon'
import { useAuthActions, resolveGoogleRedirect } from '../hooks/useAuthActions'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { mapAuthError } from '../utils/error-mapper'
import { routes } from '@/constants/routes'
import { useTranslation } from '@/providers/I18nProvider'

export function LoginForm() {
  const { t } = useTranslation()
  const { loginWithEmail, loginWithGoogle, sendPasswordReset } = useAuthActions()
  const router = useRouter()
  const { user, loading: authLoading } = useCurrentUser()

  useEffect(() => {
    resolveGoogleRedirect().then((u) => { if (u) router.replace(routes.search) })
  }, [router])

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.role === 'support_agent' ? routes.crm : routes.search)
    }
  }, [user, authLoading, router])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isActivationMode, setIsActivationMode] = useState(false)
  const [accessId, setAccessId] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isResetMode, setIsResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (isResetMode) {
      if (!resetEmail) { setError(t('auth.errorFillAll')); return }
      setLoading(true); setError(null); setResetSuccess(false)
      try {
        await sendPasswordReset(resetEmail)
        setResetSuccess(true)
      } catch (err) {
        setError(mapAuthError(err))
      } finally {
        setLoading(false)
      }
      return
    }

    if (isActivationMode) {
      if (!accessId || !email || !password || !confirmPassword) { setError(t('auth.errorFillAll')); return }
      if (password !== confirmPassword) { setError(t('auth.errorPasswordMatch')); return }
      setLoading(true); setError(null)
      try {
        const res = await fetch(`/api/team/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessId, email, password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || data.message || "Erreur d'activation")
        await loginWithEmail(email, password)
      } catch (err: any) {
        setError(err.message || 'Erreur réseau')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!email || !password) { setError(t('auth.errorFillAll')); return }
    setLoading(true); setError(null)
    try {
      await loginWithEmail(email, password)
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  // Spinner CSS
  const spinStyle = `@keyframes spin { to { transform: rotate(360deg); } }`

  if (authLoading || user) {
    return (
      <div className="flex min-h-[300px] w-full max-w-[420px] flex-col items-center justify-center rounded-[20px] border border-border bg-card p-10 text-muted-foreground shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <style dangerouslySetInnerHTML={{ __html: spinStyle }} />
        <span
          className="inline-block h-8 w-8 rounded-full border-[3px] border-white/10"
          style={{ borderTopColor: 'hsl(var(--primary))', animation: 'spin 0.8s linear infinite' }}
        />
        <p className="mt-4 text-[14px]">{t('auth.loading' as any) || 'Chargement…'}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[420px] rounded-[20px] border border-border bg-card p-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      <style dangerouslySetInnerHTML={{ __html: spinStyle }} />

      {/* Header */}
      <div className="mb-8 text-center">
        <ScIcon size={48} interactive style={{ marginBottom: 16 }} />
        <h1 className="mb-2 mt-0 font-['Syne',sans-serif] text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
          {isResetMode
            ? 'Réinitialiser le mot de passe'
            : isActivationMode
              ? t('auth.activateTitle')
              : t('auth.loginTitle')}
        </h1>
        <p className="m-0 text-[13px] text-muted-foreground">
          {isResetMode
            ? 'Saisissez votre e-mail pour recevoir un lien de réinitialisation.'
            : isActivationMode
              ? t('auth.activateSubtitle')
              : t('auth.loginSubtitle')}
        </p>
      </div>

      {/* Google Sign-In */}
      {!isActivationMode && !isResetMode && (
        <>
          <button
            id="btn-google-login"
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={googleLoading || loading}
            className="mb-1 flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-border bg-white/[0.04] px-4 py-[11px] text-[14px] font-semibold text-foreground transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <span
                className="inline-block h-[18px] w-[18px] shrink-0 rounded-full border-2 border-white/15"
                style={{ borderTopColor: 'hsl(var(--primary))', animation: 'spin 0.7s linear infinite' }}
              />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            )}
            {googleLoading ? 'Connexion…' : 'Se connecter avec Google'}
          </button>

          {/* Divider */}
          <div className="my-4 flex items-center gap-2.5 text-[12px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      {isResetMode ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <FormField label={t('auth.email')} required>
            <Input type="email" placeholder="vous@exemple.cm" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
          </FormField>

          {resetSuccess && (
            <div className="rounded-lg border border-green-500/25 bg-green-500/8 px-3.5 py-2.5 text-[13px] text-green-400">
              Un email de réinitialisation a été envoyé à l&apos;adresse indiquée.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-3.5 py-2.5 text-[13px] text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%', marginTop: 4 }}>
            Envoyer le lien de réinitialisation
          </Button>
          <Button type="button" variant="outline" size="lg" style={{ width: '100%' }} onClick={() => { setIsResetMode(false); setResetSuccess(false); setError(null) }}>
            Retour à la connexion
          </Button>
        </form>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          {isActivationMode && (
            <FormField label={t('auth.accessId')} required>
              <Input type="text" placeholder="Ex: jeandupont@entreprise" value={accessId} onChange={(e) => setAccessId(e.target.value)} />
            </FormField>
          )}

          <FormField label={t('auth.email')} required>
            <Input type="email" placeholder="vous@exemple.cm" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
          </FormField>

          <FormField label={isActivationMode ? t('auth.newPassword') : t('auth.password')} required>
            <div className="relative">
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                autoComplete={isActivationMode ? 'new-password' : 'current-password'}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 80 }}
              />
              {!isActivationMode && (
                <button
                  type="button"
                  onClick={() => { setIsResetMode(true); setError(null) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent text-[12px] font-semibold text-primary"
                >
                  Oublié ?
                </button>
              )}
            </div>
          </FormField>

          {isActivationMode && (
            <FormField label={t('auth.confirmPassword')} required>
              <Input type="password" placeholder="••••••••" value={confirmPassword} autoComplete="new-password" onChange={(e) => setConfirmPassword(e.target.value)} />
            </FormField>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-3.5 py-2.5 text-[13px] text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%', marginTop: 4 }}>
            {isActivationMode ? t('auth.activateBtn') : t('auth.loginBtn')}
          </Button>
          <Button type="button" variant="outline" size="lg" style={{ width: '100%' }} onClick={() => { setIsActivationMode(!isActivationMode); setError(null) }}>
            {isActivationMode ? t('auth.switchToLogin') : t('auth.switchToActivate')}
          </Button>
        </form>
      )}

      {!isActivationMode && !isResetMode && (
        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link href={routes.register} className="font-semibold text-primary">
            {t('auth.createAccount')}
          </Link>
        </p>
      )}
    </div>
  )
}
