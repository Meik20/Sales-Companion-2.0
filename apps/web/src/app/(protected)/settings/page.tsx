'use client'

import { useState } from 'react'
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
import { PLAN_LIMITS } from '@sales-companion/shared'
import { ArrowUpRight, Check, Lock } from 'lucide-react'

const planDetails: Record<string, { labelKey: string; featureKeys: string[] }> = {
  free: {
    labelKey: 'settings.plans.free',
    featureKeys: ['settings.features.basicSearch', 'settings.features.personalPipeline']
  },
  starter: {
    labelKey: 'settings.plans.starter',
    featureKeys: [
      'settings.features.advancedSearch',
      'settings.features.personalPipeline',
      'settings.features.excelExport'
    ]
  },
  pro: {
    labelKey: 'settings.plans.pro',
    featureKeys: [
      'settings.features.allStarter',
      'settings.features.pipelineUnlimited',
      'settings.features.aiAssistant',
      'settings.features.prioritySupport'
    ]
  },
  enterprise: {
    labelKey: 'settings.plans.enterprise',
    featureKeys: [
      'settings.features.allPro',
      'settings.features.oneThousandSearches',
      'settings.features.teamManagement',
      'settings.features.dedicatedSupport'
    ]
  }
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

  const isGoogleUser =
    auth.currentUser?.providerData.some((p) => p.providerId === 'google.com') ?? false
  const isSupport = user?.role === 'support_agent' || (user?.role as string) === 'support'
  const isEmailLocked = user?.role === 'member' || isSupport

  // ── Hiérarchie organisationnelle ────────────────────────────────────
  const isSeniorManager = user?.orgRole === 'senior_manager' || !user?.orgRole
  const isTeamManager = user?.role === 'manager' && user?.orgRole === 'team_manager'

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail) return
    if (isEmailLocked) {
      setEmailError(t(isSupport ? 'settings.supportEmailLocked' : 'settings.memberEmailLocked'))
      return
    }
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
  const planInfo = (planDetails[plan as keyof typeof planDetails] ?? planDetails['free'])!

  return (
    <main>
      <AppShell>
        <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

        <div className="flex flex-col gap-5">
          {/* ── Abonnement (masqué pour l'agent support car pas de quota) ── */}
          {!isSupport && (
            <DataCard title={t('settings.currentSubscription')}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <span className="text-[20px] font-extrabold text-foreground">
                      {t('settings.planLabel')} {t(planInfo.labelKey as any)}
                    </span>
                    <Badge
                      variant={
                        plan === 'enterprise' ? 'gold' : plan === 'pro' ? 'success' : 'default'
                      }
                    >
                      {t(planInfo.labelKey as any)}
                    </Badge>
                  </div>
                  <p className="m-0 text-[13px] text-muted-foreground">
                    {plan === 'free'
                      ? t('landing.plansSection.pFree1' as any)
                      : `${user?.dailyLimit ?? PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? 10} ${t('settings.searchesPerDay')}`}
                  </p>
                </div>

                {plan !== 'enterprise' &&
                (user?.role === 'independent' || (user?.role === 'manager' && isSeniorManager)) ? (
                  <button
                    onClick={() => router.push(routes.upgrade)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <ArrowUpRight size={15} />
                    {t('settings.upgradeBtn')}
                  </button>
                ) : plan !== 'enterprise' && isTeamManager ? (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2 text-[12px] text-amber-900 dark:text-amber-200">
                    <Lock size={13} className="shrink-0 text-amber-700 dark:text-amber-400" />
                    <span>
                      La gestion de l&apos;abonnement est réservée au{' '}
                      <strong>Senior Manager</strong> de votre organisation.
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {planInfo.featureKeys.map((fk) => (
                  <span
                    key={fk}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-[12px] font-medium text-muted-foreground"
                  >
                    <Check size={12} strokeWidth={2.5} className="text-primary shrink-0" />
                    {t(fk as any)}
                  </span>
                ))}
              </div>
            </DataCard>
          )}

          <DataCard title={t('settings.securityTitle')} subtitle={t('settings.securitySubtitle')}>
            <div className="flex flex-col gap-6">
              {/* Adresse E-mail Section */}
              <div className="flex flex-col gap-3 border-b border-border pb-6">
                <h3 className="m-0 text-[15px] font-bold text-foreground">
                  {t('settings.emailTitle')}
                </h3>
                <p className="m-0 text-[13px] text-muted-foreground">
                  {t('settings.currentEmailLabel')}{' '}
                  <strong className="text-foreground">{user?.email}</strong>
                </p>

                {isGoogleUser ? (
                  <div className="rounded-lg border border-border bg-secondary/30 p-3 text-[12px] text-muted-foreground">
                    {t('settings.googleEmailNote')}
                  </div>
                ) : isEmailLocked ? (
                  <div className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/40 p-3.5 text-[13px] text-muted-foreground">
                    <Lock size={15} className="shrink-0 text-muted-foreground" />
                    <span>
                      {isSupport
                        ? t('settings.supportEmailLocked')
                        : t('settings.memberEmailLocked')}
                    </span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleUpdateEmail}
                    className="flex max-w-[400px] flex-col gap-2.5"
                  >
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
                    {emailError && <div className="text-[12px] text-red-600 dark:text-red-400 font-semibold">{emailError}</div>}
                    {emailSuccess && (
                      <div className="text-[12px] text-emerald-700 dark:text-emerald-400 font-bold">{emailSuccess}</div>
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
                    {pwError && <div className="text-[12px] text-red-600 dark:text-red-400 font-semibold">{pwError}</div>}
                    {pwSuccess && <div className="text-[12px] text-emerald-700 dark:text-emerald-400 font-bold">{pwSuccess}</div>}
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
