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
import { BUSINESS_SECTORS } from '@sales-companion/shared'
import { useTranslation } from '@/providers/I18nProvider'

type RoleOption = 'independent' | 'manager'

export function RegisterForm() {
  const { t } = useTranslation()
  const { registerWithEmail, loginWithGoogle } = useAuthActions()
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

  const roleOptions: { value: RoleOption; label: string; desc: string }[] = [
    { value: 'independent', label: t('auth.independent'), desc: t('auth.independentDesc') },
    { value: 'manager', label: t('auth.manager'), desc: t('auth.managerDesc') }
  ]

  const [name, setName] = useState('')
  const [role, setRole] = useState<RoleOption>('independent')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [sector, setSector] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    try {
      const result = await loginWithGoogle()
      if (result) router.replace(routes.search)
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !password) {
      setError(t('auth.errorFillAll'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.errorPasswordLength'))
      return
    }
    setLoading(true)
    setError(null)

    try {
      await registerWithEmail({
        email,
        password,
        name,
        role,
        companyName: role === 'manager' ? companyName : undefined,
        sector: sector || undefined
      })
      // ✅ Tout le monde va sur /search — l'AuthGuard gère la suite :
      // - si email non vérifié → affiche le mur de vérification email
      // - si manager + email vérifié + non actif → redirige vers /upgrade
      // - si independent + email vérifié → accès direct
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
          maxWidth: 460,
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
        maxWidth: 460,
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
          {t('auth.registerTitle')}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>
          {t('auth.registerSubtitle')}
        </p>
      </div>

      {/* Google Sign-In button */}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      <button
        id="btn-google-register"
        type="button"
        onClick={() => void handleGoogleSignIn()}
        disabled={googleLoading || loading || role === 'manager'}
        title={role === 'manager' ? 'Le compte Manager nécessite une inscription par email pour le processus de validation' : undefined}
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
          color: role === 'manager' ? colors.textDim : colors.text,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: googleLoading || loading || role === 'manager' ? 'not-allowed' : 'pointer',
          opacity: googleLoading || loading || role === 'manager' ? 0.45 : 1,
          transition: 'background 200ms',
          marginBottom: role === 'manager' ? 2 : 4
        }}
        onMouseEnter={(e) => {
          if (!googleLoading && !loading && role !== 'manager')
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
        {googleLoading ? 'Connexion…' : "S'inscrire avec Google"}
      </button>
      {role === 'manager' && (
        <p style={{ fontSize: 11, color: colors.textDim, textAlign: 'center', margin: '0 0 4px' }}>
          🔒 L&apos;inscription Google n&apos;est pas disponible pour le compte Manager
        </p>
      )}

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
        <span>ou avec un email</span>
        <div style={{ flex: 1, height: 1, background: colors.border }} />
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <FormField label={t('auth.fullName')} required>
          <Input
            placeholder="Jean Dupont"
            value={name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>

        <FormField label={t('auth.email')} required>
          <Input
            type="email"
            placeholder="vous@exemple.cm"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>

        <FormField label={t('auth.password')} required hint="Minimum 6 caractères">
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        {/* Rôle */}
        <FormField label={t('auth.accountType')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {roleOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: `1px solid ${role === opt.value ? 'rgba(46,160,90,0.5)' : colors.border}`,
                  background:
                    role === opt.value ? 'rgba(27,122,62,0.12)' : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 200ms ease',
                  fontFamily: 'inherit'
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: role === opt.value ? colors.greenMid : colors.text
                  }}
                >
                  {opt.label}
                </div>
                <div style={{ fontSize: 11, color: colors.textMid, marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </FormField>

        {/* Secteur d'activité */}
        <FormField label={t('auth.sector')} required>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              borderRadius: 10,
              border: `1.5px solid ${colors.border}`,
              background: colors.bg2,
              color: colors.text,
              fontSize: 13,
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          >
            <option value="">{t('auth.selectSector')}</option>
            {BUSINESS_SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>

        {/* Nom de l'entreprise (uniquement pour Manager) */}
        {role === 'manager' && (
          <FormField label={t('auth.companyName')} required>
            <Input
              placeholder="Ex: Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
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
          {t('auth.createAccount')}
        </Button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: colors.textMid }}>
        {t('auth.alreadyAccount')}{' '}
        <Link href={routes.login} style={{ color: colors.greenMid, fontWeight: 600 }}>
          {t('auth.loginBtn')}
        </Link>
      </p>
    </div>
  )
}
