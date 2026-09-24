'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { ScIcon } from '@/components/ui/ScIcon'
import { useAuthActions, resolveGoogleRedirect } from '../hooks/useAuthActions'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { mapAuthError } from '../utils/error-mapper'
import { routes } from '@/constants/routes'
import { BUSINESS_SECTORS, SUPPORTED_COUNTRIES, validatePhoneForCountry } from '@sales-companion/shared'
import { useTranslation } from '@/providers/I18nProvider'
import { isCorporateEmail } from '../utils/email-validator'
import { ShieldCheck, Globe2, Phone } from 'lucide-react'

type RoleOption = 'independent' | 'manager'

const SPIN_CSS = `@keyframes spin { to { transform: rotate(360deg); } }`

export function RegisterForm() {
  const { t } = useTranslation()
  const { registerWithEmail, loginWithGoogle } = useAuthActions()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useCurrentUser()

  const exemptionParam = searchParams.get('exemption') || searchParams.get('token')
  const emailParam = searchParams.get('email')
  const roleParam = searchParams.get('role')
  const nameParam = searchParams.get('name')
  const companyParam = searchParams.get('company')
  const sectorParam = searchParams.get('sector')

  const [name, setName] = useState(nameParam || '')
  const [role, setRole] = useState<RoleOption>(roleParam === 'manager' || exemptionParam ? 'manager' : 'independent')
  const [country, setCountry] = useState<string>('CM')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(emailParam || '')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState(companyParam || '')
  const [sector, setSector] = useState<string>(sectorParam || '')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [exemptionToken, setExemptionToken] = useState<string | null>(exemptionParam)
  const [exemptionValid, setExemptionValid] = useState<boolean | null>(null)
  const [exemptionInfo, setExemptionInfo] = useState<{ companyName?: string; name?: string } | null>(null)

  useEffect(() => {
    resolveGoogleRedirect().then((u) => { if (u) router.replace(routes.search) })
  }, [router])

  useEffect(() => {
    if (!authLoading && user) router.replace(routes.search)
  }, [user, authLoading, router])

  // Vérifier et appliquer le jeton de dérogation si présent
  useEffect(() => {
    if (!exemptionParam) return
    setExemptionToken(exemptionParam)
    fetch(`/api/auth/validate-exemption?token=${encodeURIComponent(exemptionParam)}${emailParam ? `&email=${encodeURIComponent(emailParam)}` : ''}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setExemptionValid(true)
          setExemptionInfo(data.exemption)
          setRole('manager')
          if (data.exemption.name && !name) setName(data.exemption.name)
          if (data.exemption.email && !email) setEmail(data.exemption.email)
          if (data.exemption.companyName && !companyName) setCompanyName(data.exemption.companyName)
          if (data.exemption.sector && !sector) setSector(data.exemption.sector)
        } else {
          setExemptionValid(false)
          setError(data.error || 'Lien de dérogation invalide ou expiré.')
        }
      })
      .catch(() => {
        setExemptionValid(false)
      })
  }, [exemptionParam, emailParam])

  const roleOptions: { value: RoleOption; label: string; desc: string }[] = [
    { value: 'independent', label: t('auth.independent'), desc: t('auth.independentDesc') },
    { value: 'manager', label: t('auth.manager'), desc: t('auth.managerDesc') }
  ]

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

  const selectedCountryObj = SUPPORTED_COUNTRIES.find((c) => c.code === country) ?? SUPPORTED_COUNTRIES[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !password || !phone.trim() || !country) {
      setError(t('auth.errorFillAll'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.errorPasswordLength'))
      return
    }

    // Validation du numéro de téléphone obligatoire et cohérent avec l'indicatif pays
    if (!validatePhoneForCountry(phone, country)) {
      setError(t('auth.invalidPhone' as any) || 'Numéro de téléphone invalide pour le pays sélectionné.')
      return
    }

    // Règle de sécurité : Compte Manager avec email professionnel obligatoire
    // Sauf si dérogation validée par l'administrateur
    if (role === 'manager' && !isCorporateEmail(email) && !exemptionValid) {
      setError(
        t('auth.corporateEmailRequired' as any) ||
          "L'inscription Manager requiert une adresse email professionnelle d'entreprise (ex: prenom.nom@votre-entreprise.com). Les adresses grand public (Gmail, Yahoo, Outlook...) ne sont pas autorisées sans dérogation préalable."
      )
      return
    }

    setLoading(true); setError(null)
    try {
      const createdUser = await registerWithEmail({
        email, password, name, role,
        country,
        phone: phone.trim(),
        companyName: role === 'manager' ? companyName : undefined,
        sector: sector || undefined
      })

      // Marquer le jeton de dérogation comme consommé
      if (exemptionToken && exemptionValid && createdUser?.uid) {
        fetch('/api/auth/consume-exemption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: exemptionToken, uid: createdUser.uid, email })
        }).catch(() => {})
      }

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

      {/* Dérogation autorisée par l'admin */}
      {exemptionValid && (
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-300 flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-blue-400 text-[13px]">
              Dérogation de domaine approuvée ✨
            </div>
            <div className="text-[11px] text-blue-200/80 mt-0.5 leading-relaxed">
              Votre demande de compte Manager pour l'entreprise{' '}
              <strong>{companyName || exemptionInfo?.companyName || 'votre organisation'}</strong> a été validée par l'administration.
            </div>
          </div>
        </div>
      )}

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

        <FormField
          label={t('auth.email')}
          required
          hint={role === 'manager' ? t('auth.corporateEmailHint' as any) || 'Adresse professionnelle requise (ex: contact@societe.cm)' : undefined}
        >
          <Input
            type="email"
            placeholder={role === 'manager' ? 'prenom.nom@entreprise.cm' : 'vous@exemple.cm'}
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          {role === 'manager' && (
            <p className="mt-1.5 text-[11px] text-muted-foreground/80">
              💡 {t('auth.noCorporateEmailContactSupport' as any) || "Votre entreprise n'a pas de nom de domaine propre ?"}{' '}
              <Link
                href={`${routes.support}?type=corporate_domain${email.trim() ? `&email=${encodeURIComponent(email.trim())}` : ''}${name.trim() ? `&name=${encodeURIComponent(name.trim())}` : ''}${companyName.trim() ? `&company=${encodeURIComponent(companyName.trim())}` : ''}${sector.trim() ? `&sector=${encodeURIComponent(sector.trim())}` : ''}`}
                className="font-semibold text-primary underline underline-offset-2"
              >
                {t('sidebar.support')}
              </Link>
            </p>
          )}
        </FormField>

        <FormField label={t('auth.password')} required hint="Minimum 6 caractères">
          <Input type="password" placeholder="••••••••" value={password} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
        </FormField>

        {/* Pays & Téléphone pour validation */}
        <FormField
          label={t('auth.country' as any) || 'Pays'}
          required
          hint={t('auth.countryLockedNote' as any) || 'Défini une seule fois à l\'inscription pour filtrer vos données.'}
        >
          <div className="relative">
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value)
                // If phone had old dial code or was empty, adjust or let user type
              }}
              className="h-10 w-full cursor-pointer rounded-[10px] border border-border bg-card px-3 text-[13px] font-medium text-foreground outline-none focus:border-primary"
            >
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} ({c.dialCode})
                </option>
              ))}
            </select>
          </div>
        </FormField>

        <FormField
          label={t('auth.phone' as any) || 'Numéro de téléphone'}
          required
          hint={t('auth.phoneHint' as any) || 'Obligatoire — valide et confirme votre pays.'}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-10 items-center justify-center rounded-[10px] border border-border bg-muted/40 px-3 text-[13px] font-semibold text-foreground/80 shrink-0">
              <span className="mr-1.5">{selectedCountryObj.flag}</span>
              <span>{selectedCountryObj.dialCode}</span>
            </div>
            <Input
              type="tel"
              placeholder={selectedCountryObj.examplePhone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1"
            />
          </div>
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
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-border bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className={`text-[13px] font-semibold ${role === opt.value ? 'text-blue-400' : 'text-foreground'}`}>
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
