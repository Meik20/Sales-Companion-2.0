'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/forms/FormField'
import { ScIcon } from '@/components/ui/ScIcon'
import { useAuthActions } from '../hooks/useAuthActions'
import { mapAuthError } from '../utils/error-mapper'
import { routes } from '@/constants/routes'
import { colors } from '@/styles/tokens'
import { BUSINESS_SECTORS } from '@sales-companion/shared'
import { useTranslation } from '@/providers/I18nProvider'

type RoleOption = 'independent' | 'manager'

export function RegisterForm() {
  const { t } = useTranslation()
  const { registerWithEmail } = useAuthActions()

  const roleOptions: { value: RoleOption; label: string; desc: string }[] = [
    { value: 'independent', label: t('auth.independent'), desc: t('auth.independentDesc') },
    { value: 'manager', label: t('auth.manager'), desc: t('auth.managerDesc') },
  ]

  const router = useRouter()

  const [name, setName] = useState('')
  const [role, setRole] = useState<RoleOption>('independent')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [sector, setSector] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      router.replace(routes.search)
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
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
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
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
            letterSpacing: '-.03em',
          }}
        >
          {t('auth.registerTitle')}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>
          {t('auth.registerSubtitle')}
        </p>
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
                  border: `1px solid ${
                    role === opt.value ? 'rgba(46,160,90,0.5)' : colors.border
                  }`,
                  background:
                    role === opt.value
                      ? 'rgba(27,122,62,0.12)'
                      : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 200ms ease',
                  fontFamily: 'inherit',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: role === opt.value ? colors.greenMid : colors.text,
                  }}
                >
                  {opt.label}
                </div>
                <div style={{ fontSize: 11, color: colors.textMid, marginTop: 2 }}>
                  {opt.desc}
                </div>
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
              boxSizing: 'border-box',
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
              color: '#f87171',
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
