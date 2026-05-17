'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { ScIcon } from '@/components/ui/ScIcon'
import { useAuthActions } from '../hooks/useAuthActions'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { mapAuthError } from '../utils/error-mapper'
import { routes } from '@/constants/routes'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

export function LoginForm() {
  const { t } = useTranslation()
  const { loginWithEmail } = useAuthActions()
  const router = useRouter()
  const { user, loading: authLoading } = useCurrentUser()

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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

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
          {isActivationMode ? t('auth.activateTitle') : t('auth.loginTitle')}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>
          {isActivationMode ? t('auth.activateSubtitle') : t('auth.loginSubtitle')}
        </p>
      </div>

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
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            autoComplete={isActivationMode ? 'new-password' : 'current-password'}
            onChange={(e) => setPassword(e.target.value)}
          />
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

      {!isActivationMode && (
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
