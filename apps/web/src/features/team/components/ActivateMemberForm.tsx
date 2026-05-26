'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { useGetAccessInfo } from '@/features/auth/hooks/useGetAccessInfo'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

type Props = {
  accessId: string
  onSuccess: (email: string, password: string) => void
}

export function ActivateMemberForm({ accessId, onSuccess }: Props) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const {
    data: accessInfo,
    isLoading: isLoadingInfo,
    isError: isErrorInfo,
    error: infoError
  } = useGetAccessInfo(accessId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation OBLIGATOIRE de l'email
    if (!email.trim()) {
      setError(t('auth.invalidEmail'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('auth.invalidEmailFormat'))
      return
    }
    if (!password || !confirmPassword) {
      setError(t('auth.errorFillAll'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.errorPasswordLength'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.errorPasswordMatch'))
      return
    }

    setIsPending(true)
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessId, email: email.trim(), password })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((json as { message?: string }).message ?? `Erreur ${res.status}`)
      }
      // ✅ Pass email and password to parent for auto-login
      onSuccess(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errorActivation'))
    } finally {
      setIsPending(false)
    }
  }

  /* ── États de chargement / erreur du lien ── */
  if (isLoadingInfo) {
    return (
      <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
        {t('auth.verifyingLink')}
      </div>
    )
  }

  if (isErrorInfo) {
    const errMsg = infoError instanceof Error ? infoError.message : t('auth.invalidLink')
    return (
      <div
        style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10,
          padding: '16px 18px',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>❌</div>
        <div style={{ fontWeight: 600, color: '#f87171', marginBottom: 8, fontSize: 15 }}>
          {t('auth.accessImpossible')}
        </div>
        <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>{errMsg}</div>
        <div style={{ fontSize: 12, color: colors.textMid, marginTop: 12 }}>
          {t('auth.contactManager')}
        </div>
      </div>
    )
  }

  if (!accessInfo) {
    return (
      <div style={{ textAlign: 'center', color: colors.textMid, padding: 20 }}>
        {t('auth.unableToLoadAccess')}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Récapitulatif de l'accès */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: colors.bg,
          padding: 14,
          borderRadius: 10
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: colors.textDim,
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              marginBottom: 3
            }}
          >
            {t('auth.accessId')}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.text,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              textTransform: 'lowercase'
            }}
          >
            {accessId}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              color: colors.textDim,
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              marginBottom: 3
            }}
          >
            {t('auth.name')}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
            {accessInfo.firstname} {accessInfo.lastname}
          </div>
        </div>
        {accessInfo.company && (
          <div>
            <div
              style={{
                fontSize: 11,
                color: colors.textDim,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                marginBottom: 3
              }}
            >
              {t('auth.company')}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
              {accessInfo.company}
            </div>
          </div>
        )}
      </div>

      {/* Email — TOUJOURS OBLIGATOIRE */}
      <FormField label={t('auth.yourEmailAddress')} required hint={t('auth.emailHint')}>
        <Input
          type="email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          autoComplete="email"
        />
      </FormField>

      <FormField label={t('auth.newPassword')} required>
        <Input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
          autoComplete="new-password"
        />
      </FormField>

      <FormField label={t('auth.confirmPassword')} required>
        <Input
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isPending}
          autoComplete="new-password"
        />
      </FormField>

      {/* Bloc d'erreur global */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 13,
            color: '#ef4444',
            lineHeight: 1.5
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ fontSize: 12, color: colors.textMid, lineHeight: 1.7 }}>
        <p style={{ margin: '0 0 4px' }}>{t('auth.atLeast6Chars')}</p>
        <p style={{ margin: 0 }}>{t('auth.allowedChars')}</p>
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={isPending || !email.trim() || !password || !confirmPassword}
        loading={isPending}
        style={{ width: '100%', marginTop: 8 }}
      >
        {isPending ? t('auth.activationInProgress') : t('auth.activateBtn')}
      </Button>
    </form>
  )
}
