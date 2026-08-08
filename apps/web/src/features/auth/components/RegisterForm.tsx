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
import { BUSINESS_SECTORS } from '@sales-companion/shared'
import { useTranslation } from '@/providers/I18nProvider'

type RoleOption = 'independent' | 'manager'

const SPIN_CSS = `@keyframes spin { to { transform: rotate(360deg); } }`

export function RegisterForm() {
  const { t } = useTranslation()
  const { registerWithEmail, loginWithGoogle } = useAuthActions()
  const router = useRouter()
  const { user, loading: authLoading } = useCurrentUser()

  useEffect(() => {
    resolveGoogleRedirect().then((u) => { if (u) router.replace(routes.search) })
  }, [router])

  useEffect(() => {
    if (!authLoading && user) router.replace(routes.search)
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
    setGoogleLoading(true); setError(null)
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
    if (!name || !email || !password) { setError(t('auth.errorFillAll')); return }
    if (password.length < 6) { setError(t('auth.errorPasswordLength')); return }
    setLoading(true); setError(null)
    try {
      await registerWithEmail({
        email, password, name, role,
        companyName: role === 'manager' ? companyName : undefined,
        sector: sector || undefined
      })
      router.replace(routes.search)
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || user) {
    return (
      <div className="flex min-h-[300px] w-full max-w-[460px] flex-col items-center justify-center rounded-[20px] border border-border bg-card p-10 text-muted-foreground shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <style dangerouslySetInnerHTML={{ __html: SPIN_CSS }} />
        <span
          className="inline-block h-8 w-8 rounded-full border-[3px] border-white/10"
          style={{ borderTopColor: 'hsl(var(--primary))', animation: 'spin 0.8s linear infinite' }}
        />
        <p className="mt-4 text-[14px]">{t('auth.loading' as any) || 'Chargement…'}</p>
      </div>
    )
  }

  const isGoogleDisabled = googleLoading || loading || role === 'manager'

  return (
    <div className="w-full max-w-[460px] rounded-[20px] border border-border bg-card p-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      <style dangerouslySetInnerHTML={{ __html: SPIN_CSS }} />

      {/* Header */}
      <div className="mb-8 text-center">
        <ScIcon size={48} interactive style={{ marginBottom: 16 }} />
        <h1 className="mb-2 mt-0 font-['Syne',sans-serif] text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
          {t('auth.registerTitle')}
        </h1>
        <p className="m-0 text-[13px] text-muted-foreground">{t('auth.registerSubtitle')}</p>
      </div>

      {/* Google Sign-In */}
      <button
        id="btn-google-register"
        type="button"
        onClick={() => void handleGoogleSignIn()}
        disabled={isGoogleDisabled}
        title={role === 'manager' ? 'Le compte Manager nécessite une inscription par email' : undefined}
        className={`mb-1 flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-border bg-white/[0.04] px-4 py-[11px] text-[14px] font-semibold text-foreground transition-colors ${
          isGoogleDisabled
            ? 'cursor-not-allowed opacity-45'
            : 'cursor-pointer hover:bg-white/[0.08]'
        }`}
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
        {googleLoading ? 'Connexion…' : "S'inscrire avec Google"}
      </button>

      {role === 'manager' && (
        <p className="mb-1 mt-0 text-center text-[11px] text-muted-foreground/60">
          🔒 L&apos;inscription Google n&apos;est pas disponible pour le compte Manager
        </p>
      )}

      {/* Divider */}
      <div className="my-4 flex items-center gap-2.5 text-[12px] text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>ou avec un email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <FormField label={t('auth.fullName')} required>
          <Input placeholder="Jean Dupont" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
        </FormField>

        <FormField label={t('auth.email')} required>
          <Input type="email" placeholder="vous@exemple.cm" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        </FormField>

        <FormField label={t('auth.password')} required hint="Minimum 6 caractères">
          <Input type="password" placeholder="••••••••" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
        </FormField>

        {/* Rôle */}
        <FormField label={t('auth.accountType')}>
          <div className="grid grid-cols-2 gap-2">
            {roleOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={`rounded-[10px] border px-3.5 py-3 text-left transition-all duration-200 ${
                  role === opt.value
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-border bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className={`text-[13px] font-semibold ${role === opt.value ? 'text-green-400' : 'text-foreground'}`}>
                  {opt.label}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{opt.desc}</div>
              </button>
            ))}
          </div>
        </FormField>

        {/* Secteur */}
        <FormField label={t('auth.sector')} required>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-[10px] border border-border bg-card px-3 text-[13px] text-foreground outline-none"
          >
            <option value="">{t('auth.selectSector')}</option>
            {BUSINESS_SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FormField>

        {/* Nom entreprise (Manager only) */}
        {role === 'manager' && (
          <FormField label={t('auth.companyName')} required>
            <Input placeholder="Ex: Acme Corp" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </FormField>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-3.5 py-2.5 text-[13px] text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%', marginTop: 4 }}>
          {t('auth.createAccount')}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        {t('auth.alreadyAccount')}{' '}
        <Link href={routes.login} className="font-semibold text-primary">
          {t('auth.loginBtn')}
        </Link>
      </p>
    </div>
  )
}
