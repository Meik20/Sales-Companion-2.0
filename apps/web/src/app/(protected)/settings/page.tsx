'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataCard, Badge } from '@/components/ui/index'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'
import { routes } from '@/constants/routes'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthActions } from '@/features/auth/hooks/useAuthActions'
import { auth } from '@/services/firebase/client'

const planDetails = {
  free: {
    labelKey: 'settings.plans.free',
    searches: 10,
    featureKeys: ['settings.features.basicSearch', 'settings.features.personalPipeline']
  },
  starter: {
    labelKey: 'settings.plans.starter',
    searches: 50,
    featureKeys: [
      'settings.features.advancedSearch',
      'settings.features.personalPipeline',
      'settings.features.excelExport'
    ]
  },
  pro: {
    labelKey: 'settings.plans.pro',
    searches: 200,
    featureKeys: [
      'settings.features.allStarter',
      'settings.features.pipelineUnlimited',
      'settings.features.aiAssistant',
      'settings.features.prioritySupport'
    ]
  },
  enterprise: {
    labelKey: 'settings.plans.enterprise',
    searches: 1000,
    featureKeys: [
      'settings.features.allPro',
      'settings.features.oneThousandSearches',
      'settings.features.teamManagement',
      'settings.features.dedicatedSupport'
    ]
  }
}

type DesignTheme = 'linkedin' | 'firebase'
const STORAGE_KEY = 'sc-design-theme'

function applyDesign(d: DesignTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-design', d)
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { pushToast } = useToast()
  const router = useRouter()

  const { updateUserEmail, sendPasswordReset } = useAuthActions()

  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)

  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState<string | null>(null)

  const isGoogleUser = auth.currentUser?.providerData.some(p => p.providerId === 'google.com') ?? false

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail) return
    setEmailLoading(true)
    setEmailError(null)
    setEmailSuccess(null)
    try {
      await updateUserEmail(newEmail)
      setEmailSuccess(t('settings.emailUpdateSuccess'))
      setNewEmail('')
    } catch (err: any) {
      setEmailError(err.message || t('settings.emailUpdateError'))
    } finally {
      setEmailLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return
    setPwLoading(true)
    setPwError(null)
    setPwSuccess(null)
    try {
      await sendPasswordReset(user.email)
      setPwSuccess(t('settings.passwordResetSuccess'))
    } catch (err: any) {
      setPwError(err.message || t('settings.passwordResetError'))
    } finally {
      setPwLoading(false)
    }
  }

  const plan = user?.plan ?? 'free'
  const planInfo = planDetails[plan as keyof typeof planDetails] ?? planDetails.free

  // ── Design Theme ────────────────────────────────────────────────
  const [activeDesign, setActiveDesign] = useState<DesignTheme>('linkedin')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as DesignTheme | null
    if (stored === 'firebase' || stored === 'linkedin') setActiveDesign(stored)
  }, [])

  const handleDesignChange = async (design: DesignTheme) => {
    setActiveDesign(design)
    applyDesign(design)
    localStorage.setItem(STORAGE_KEY, design)

    // Persist to Firestore (best-effort)
    try {
      const token = await user?.getIdToken()
      if (token) {
        await fetch('/api/auth/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ designTheme: design })
        })
      }
    } catch { /* non-bloquant */ }

    pushToast({
      type: 'success',
      title: t('settings.themeActivatedToast')
    })
  }

  const themes: { id: DesignTheme; label: string; descKey: string; swatches: string[]; accent: string }[] = [
    {
      id: 'linkedin',
      label: 'LinkedIn Design',
      descKey: 'settings.themeLinkedinDesc',
      swatches: ['#0a66c2', '#f3f2ef', '#ffffff'],
      accent: '#0a66c2'
    },
    {
      id: 'firebase',
      label: 'Firebase Console',
      descKey: 'settings.themeFirebaseDesc',
      swatches: ['#FFA611', '#1967D2', '#1C1F27'],
      accent: '#FFA611'
    }
  ]

  return (
    <main>
      <AppShell>
        <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

        <div className="flex flex-col gap-5">

          {/* ── Apparence ───────────────────────────────────────── */}
          <DataCard title={t('settings.appearanceTitle')} subtitle={t('settings.appearanceSubtitle')}>
            <div className="flex flex-col gap-4">

              {/* Cartes de thème */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                {themes.map((th) => {
                  const isActive = activeDesign === th.id
                  return (
                    <button
                      key={th.id}
                      id={`design-theme-${th.id}`}
                      onClick={() => handleDesignChange(th.id)}
                      className={`flex cursor-pointer flex-col gap-2.5 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                        isActive
                          ? 'border-primary bg-primary/5 shadow-[0_0_0_3px_rgba(55,138,221,0.15)]'
                          : 'border-border bg-card hover:border-border/80'
                      }`}
                    >
                      {/* Swatches */}
                      <div className="flex gap-1.5">
                        {th.swatches.map((c, i) => (
                          <span
                            key={i}
                            className={`block h-6 w-6 rounded-md transition-transform duration-150 ${
                              isActive ? 'scale-110' : 'scale-100'
                            }`}
                            style={{
                              background: c,
                              border: c === '#ffffff' || c === '#f3f2ef' ? '1px solid rgba(0,0,0,0.12)' : 'none'
                            }}
                          />
                        ))}
                      </div>

                      {/* Label + badge actif */}
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <strong className="text-[13px] text-foreground">{th.label}</strong>
                          {isActive && (
                            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-primary">
                              {t('settings.activeBadge')}
                            </span>
                          )}
                        </div>
                        <p className="m-0 text-[11.5px] leading-relaxed text-muted-foreground">
                          {t(th.descKey as any)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Barre de switch rapide */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-secondary p-3.5">
                <span className="text-[13px] font-medium text-muted-foreground">
                  {t('settings.activeThemeLabel')}{' '}
                  <strong className="text-foreground">
                    {activeDesign === 'firebase' ? '🔥 Firebase Console' : '💼 LinkedIn Design'}
                  </strong>
                </span>
                <button
                  id="design-theme-toggle"
                  onClick={() => handleDesignChange(activeDesign === 'linkedin' ? 'firebase' : 'linkedin')}
                  className="cursor-pointer rounded-lg border border-border bg-card px-4 py-1.5 text-[12px] font-bold text-foreground transition-colors hover:bg-secondary"
                >
                  {t('settings.switchThemeBtn')}
                </button>
              </div>
            </div>
          </DataCard>

          {/* ── Abonnement (masqué pour l'agent support car pas de quota) ── */}
          {user?.role !== 'support_agent' && (
            <DataCard title={t('settings.currentSubscription')}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <span className="text-[20px] font-extrabold text-foreground">
                      {t('settings.planLabel')} {t(planInfo.labelKey as any)}
                    </span>
                    <Badge variant={plan === 'enterprise' ? 'gold' : plan === 'pro' ? 'success' : 'default'}>
                      {t(planInfo.labelKey as any)}
                    </Badge>
                  </div>
                  <p className="m-0 text-[13px] text-muted-foreground">
                    {plan === 'free'
                      ? t('landing.plansSection.pFree1' as any)
                      : planInfo.searches >= 1000
                        ? t('settings.searchesPerDay1000') || `${planInfo.searches} ${t('settings.searchesPerDay')}`
                        : `${planInfo.searches} ${t('settings.searchesPerDay')}`}
                  </p>
                </div>

                {plan !== 'enterprise' && (user?.role === 'manager' || user?.role === 'independent') ? (
                  <button
                    onClick={() => router.push(routes.upgrade)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    ⬆️ {t('settings.upgradeBtn')}
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {planInfo.featureKeys.map((fk) => (
                  <span
                    key={fk}
                    className="rounded-full border border-border bg-secondary px-3 py-1 text-[12px] font-medium text-muted-foreground"
                  >
                    ✓ {t(fk as any)}
                  </span>
                ))}
              </div>
            </DataCard>
          )}

          {/* ── Sécurité & Compte ────────────────────────────────── */}
          <DataCard title={t('settings.securityTitle')} subtitle={t('settings.securitySubtitle')}>
            <div className="flex flex-col gap-6">

              {/* Adresse E-mail Section */}
              <div className="flex flex-col gap-3 border-b border-border pb-6">
                <h3 className="m-0 text-[15px] font-bold text-foreground">
                  {t('settings.emailTitle')}
                </h3>
                <p className="m-0 text-[13px] text-muted-foreground">
                  {t('settings.currentEmailLabel')} <strong className="text-foreground">{user?.email}</strong>
                </p>

                {isGoogleUser ? (
                  <div className="rounded-lg border border-border bg-secondary/30 p-3 text-[12px] text-muted-foreground">
                    {t('settings.googleEmailNote')}
                  </div>
                ) : (
                  <form onSubmit={handleUpdateEmail} className="flex max-w-[400px] flex-col gap-2.5">
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder={t('settings.newEmailPlaceholder')}
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        loading={emailLoading}
                        style={{ flexShrink: 0 }}
                      >
                        {t('settings.updateBtn')}
                      </Button>
                    </div>
                    {emailError && (
                      <div className="text-[12px] text-red-400">{emailError}</div>
                    )}
                    {emailSuccess && (
                      <div className="text-[12px] text-green-400">{emailSuccess}</div>
                    )}
                    <span className="text-[11px] text-muted-foreground/80">
                      {t('settings.emailHint')}
                    </span>
                  </form>
                )}
              </div>

              {/* Mot de passe Section */}
              <div className="flex flex-col gap-3">
                <h3 className="m-0 text-[15px] font-bold text-foreground">
                  {t('settings.passwordTitle')}
                </h3>

                {isGoogleUser ? (
                  <div className="rounded-lg border border-border bg-secondary/30 p-3 text-[12px] text-muted-foreground">
                    {t('settings.googlePasswordNote')}
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handlePasswordReset()}
                      loading={pwLoading}
                    >
                      {t('settings.sendResetBtn')}
                    </Button>
                    {pwError && (
                      <div className="text-[12px] text-red-400">{pwError}</div>
                    )}
                    {pwSuccess && (
                      <div className="text-[12px] text-green-400">{pwSuccess}</div>
                    )}
                    <span className="text-[11px] text-muted-foreground/80">
                      {t('settings.passwordHint')}
                    </span>
                  </div>
                )}
              </div>

            </div>
          </DataCard>
        </div>
      </AppShell>
    </main>
  )
}
