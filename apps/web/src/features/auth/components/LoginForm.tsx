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
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

export function LoginForm() {
  const { t } = useTranslation()
  const { loginWithEmail, loginWithGoogle, sendPasswordReset } = useAuthActions()
  const router = useRouter()
  const { user, loading: authLoading } = useCurrentUser()

  // Handle Google redirect result on page load (post-signInWithRedirect)
  useEffect(() => {
    resolveGoogleRedirect().then((u) => {
      if (u) router.replace(routes.search)
    })
  }, [router])

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(routes.search)
    }
  }, [user, authLoading, router])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Activation mode
  const [isActivationMode, setIsActivationMode] = useState(false)
  const [accessId, setAccessId] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Reset password mode
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
      const result = await loginWithGoogle()
      if (result) {
        // Popup succeeded — immediate redirect
        router.replace(routes.search)
      }
      // If result is null, signInWithRedirect was triggered → page will reload
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (isResetMode) {
      if (!resetEmail) {
        setError(t('auth.errorFillAll'))
        return
      }
      setLoading(true)
      setError(null)
      setResetSuccess(false)
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
      if (!accessId || !email || !password || !confirmPassword) {
        setError(t('auth.errorFillAll'))
        return
      }
      if (password !== confirmPassword) {
        setError(t('auth.errorPasswordMatch'))
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/team/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessId, email, password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || data.message || "Erreur d'activation")

        // Connexion automatique
        await loginWithEmail(email, password)
        router.replace(routes.search)
      } catch (err: any) {
        setError(err.message || 'Erreur réseau')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!email || !password) {
      setError(t('auth.errorFillAll'))
      return
    }
    setLoading(true)
    setError(null)

    try {
      await loginWithEmail(email, password)
      router.replace(routes.search)
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || user) {
    return (
      <div
        style={{
          background: colors.bg2,
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          padding: 40,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          color: colors.textMid
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes spin { to { transform: rotate(360deg); } }
            `
          }}
        />
        <span
          style={{
            width: 32,
            height: 32,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: colors.greenMid,
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <p style={{ margin: '16px 0 0', fontSize: 14 }}>
          {t('auth.loading' as any) || 'Chargement…'}
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: colors.bg2,
        border: `1px solid ${colors.border}`,
        borderRadius: 20,
        padding: 40,
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <ScIcon size={48} interactive style={{ marginBottom: 16 }} />
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 22,
            fontWeight: 800,
            color: colors.text,
            fontFamily: "'Syne',sans-serif",
            letterSpacing: '-.03em'
          }}
        >
          {isResetMode
            ? 'Réinitialiser le mot de passe'
            : isActivationMode
              ? t('auth.activateTitle')
              : t('auth.loginTitle')}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>
          {isResetMode
            ? 'Saisissez votre e-mail pour recevoir un lien de réinitialisation.'
            : isActivationMode
              ? t('auth.activateSubtitle')
              : t('auth.loginSubtitle')}
        </p>
      </div>

      {/* Google Sign-In button (only in normal login mode) */}
      {!isActivationMode && !isResetMode && (
        <>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
          <button
            id="btn-google-login"
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={googleLoading || loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '11px 16px',
              borderRadius: 10,
              border: `1.5px solid ${colors.border}`,
              background: 'rgba(255,255,255,0.04)',
              color: colors.text,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: googleLoading || loading ? 'not-allowed' : 'pointer',
              opacity: googleLoading || loading ? 0.6 : 1,
              transition: 'background 200ms, border-color 200ms',
              marginBottom: 4
            }}
            onMouseEnter={(e) => {
              if (!googleLoading && !loading)
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
            }}
          >
            {googleLoading ? (
              <span
                style={{
                  width: 18,
                  height: 18,
                  border: '2px solid rgba(255,255,255,0.15)',
                  borderTopColor: colors.greenMid,
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                  flexShrink: 0
                }}
              />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              margin: '16px 0',
              color: colors.textMid,
              fontSize: 12
            }}
          >
            <div style={{ flex: 1, height: 1, background: colors.border }} />
            <span>ou</span>
            <div style={{ flex: 1, height: 1, background: colors.border }} />
          </div>
        </>
      )}

      {isResetMode ? (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <FormField label={t('auth.email')} required>
            <Input
              type="email"
              placeholder="vous@exemple.cm"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </FormField>

          {resetSuccess && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(46,160,90,0.08)',
                border: '1px solid rgba(46,160,90,0.25)',
                borderRadius: 8,
                fontSize: 13,
                color: colors.greenMid
              }}
            >
              Un email de réinitialisation a été envoyé à l&apos;adresse indiquée.
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8,
                fontSize: 13,
                color: '#f87171'
              }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            style={{ width: '100%', marginTop: 4 }}
          >
            Envoyer le lien de réinitialisation
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            style={{ width: '100%' }}
            onClick={() => {
              setIsResetMode(false)
              setResetSuccess(false)
              setError(null)
            }}
          >
            Retour à la connexion
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {isActivationMode && (
            <FormField label={t('auth.accessId')} required>
              <Input
                type="text"
                placeholder="Ex: jeandupont@entreprise"
                value={accessId}
                onChange={(e) => setAccessId(e.target.value)}
              />
            </FormField>
          )}

          <FormField label={t('auth.email')} required>
            <Input
              type="email"
              placeholder="vous@exemple.cm"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>

          <FormField label={isActivationMode ? t('auth.newPassword') : t('auth.password')} required>
            <div style={{ position: 'relative' }}>
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
                  onClick={() => {
                    setIsResetMode(true)
                    setError(null)
                  }}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: colors.greenMid,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  Oublié ?
                </button>
              )}
            </div>
          </FormField>

          {isActivationMode && (
            <FormField label={t('auth.confirmPassword')} required>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </FormField>
          )}

          {error ? (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8,
                fontSize: 13,
                color: '#f87171'
              }}
            >
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            style={{ width: '100%', marginTop: 4 }}
          >
            {isActivationMode ? t('auth.activateBtn') : t('auth.loginBtn')}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            style={{ width: '100%' }}
            onClick={() => {
              setIsActivationMode(!isActivationMode)
              setError(null)
            }}
          >
            {isActivationMode ? t('auth.switchToLogin') : t('auth.switchToActivate')}
          </Button>
        </form>
      )}

      {!isActivationMode && !isResetMode && (
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: colors.textMid }}>
          {t('auth.noAccount')}{' '}
          <Link href={routes.register} style={{ color: colors.greenMid, fontWeight: 600 }}>
            {t('auth.createAccount')}
          </Link>
        </p>
      )}
    </div>
  )
}
