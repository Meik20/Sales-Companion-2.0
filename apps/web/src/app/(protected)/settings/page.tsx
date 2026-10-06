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
import { PLAN_LIMITS } from '@sales-companion/shared'
import { ArrowUpRight, Check, Lock, Copy, ShieldCheck, ShieldAlert, Building2, Users2 } from 'lucide-react'
import { OrgManagersSection } from '@/features/team/components/OrgManagersSection'

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

  // ── Organisation & Gouvernance ──────────────────────────────────
  const [orgData, setOrgData] = useState<{
    orgCode: string
    orgRole: 'senior_manager' | 'team_manager'
    isSeniorManager: boolean
    niu: string | null
    isVerified: boolean
    companyName: string
    sector?: string | null
    managers?: { uid: string; name: string; email: string; orgRole: string; isCurrent: boolean; isSenior: boolean }[]
  } | null>(null)
  const [niuInput, setNiuInput] = useState('')
  const [niuLoading, setNiuLoading] = useState(false)
  const [niuError, setNiuError] = useState<string | null>(null)
  const [niuSuccess, setNiuSuccess] = useState<string | null>(null)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null)
  const [copiedOrgCode, setCopiedOrgCode] = useState(false)

  useEffect(() => {
    if (user?.role !== 'manager') return
    user.getIdToken().then((token) => {
      fetch('/api/team/org', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setOrgData(data)
            if (data.niu) setNiuInput(data.niu)
          }
        })
        .catch(() => {})
    })
  }, [user])

  const handleUpdateNiu = async (e: React.FormEvent) => {
    e.preventDefault()
    setNiuLoading(true)
    setNiuError(null)
    setNiuSuccess(null)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/team/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ niu: niuInput.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour')
      setOrgData(data)
      setNiuSuccess(t('settings.niuUpdateSuccess' as any) || 'Numéro d\'identification mis à jour avec succès.')
      pushToast({ type: 'success', title: 'Organisation mise à jour avec succès.' })
    } catch (err: any) {
      setNiuError(err.message)
    } finally {
      setNiuLoading(false)
    }
  }

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCodeInput.trim()) return
    setJoinLoading(true)
    setJoinError(null)
    setJoinSuccess(null)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/team/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ joinOrgCode: joinCodeInput.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors du rattachement')
      setOrgData(data)
      setJoinCodeInput('')
      setJoinSuccess(t('settings.joinOrgSuccess' as any) || 'Rattaché avec succès à l\'organisation.')
      pushToast({ type: 'success', title: 'Rattaché avec succès à l\'organisation.' })
    } catch (err: any) {
      setJoinError(err.message)
    } finally {
      setJoinLoading(false)
    }
  }

  const copyOrgCode = async () => {
    const code = orgData?.orgCode || user?.orgCode
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopiedOrgCode(true)
      pushToast({ type: 'success', title: `Code (${code}) copié.` })
      setTimeout(() => setCopiedOrgCode(false), 2000)
    } catch {
      pushToast({ type: 'info', title: `Code organisation : ${code}` })
    }
  }

  const isGoogleUser = auth.currentUser?.providerData.some(p => p.providerId === 'google.com') ?? false
  const isSupport = user?.role === 'support_agent' || (user?.role as string) === 'support'
  const isEmailLocked = user?.role === 'member' || isSupport

  // ── Hiérarchie organisationnelle ────────────────────────────────────
  // orgData.isSeniorManager est la source de vérité (vient de l'API /api/team/org)
  // On utilise aussi user.orgRole comme fallback pendant le chargement
  const isSeniorManager = orgData?.isSeniorManager ?? (user?.orgRole === 'senior_manager')
  const isTeamManager = user?.role === 'manager' && !isSeniorManager

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

  // ── Design Theme ────────────────────────────────────────────────
  const [activeDesign, setActiveDesign] = useState<DesignTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as DesignTheme | null
      if (stored === 'firebase' || stored === 'linkedin') return stored
    }
    return 'firebase'
  })

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
          {!isSupport && (
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
                      : `${user?.dailyLimit ?? PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? 10} ${t('settings.searchesPerDay')}`}
                  </p>
                </div>

                {plan !== 'enterprise' && (user?.role === 'independent' || (user?.role === 'manager' && isSeniorManager)) ? (
                  <button
                    onClick={() => router.push(routes.upgrade)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <ArrowUpRight size={15} />
                    {t('settings.upgradeBtn')}
                  </button>
                ) : plan !== 'enterprise' && isTeamManager ? (
                  <div className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/8 px-3.5 py-2 text-[12px] text-yellow-500/80">
                    <Lock size={13} className="shrink-0" />
                    <span>La gestion de l&apos;abonnement est réservée au <strong>Senior Manager</strong> de votre organisation.</span>
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

          {/* ── Organisation & Gouvernance (Manager uniquement) ── */}
          {user?.role === 'manager' && (
            <DataCard
              title={t('settings.orgTitle' as any) || 'Organisation & Gouvernance'}
              subtitle={t('settings.orgSubtitle' as any) || 'Identifiant unique de votre entreprise, certification légale et gouvernance des équipes'}
            >
              <div className="flex flex-col gap-6">

                {/* Info entreprise & Code organisation */}
                <div className="flex flex-col gap-3 border-b border-border pb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('settings.companyNameLabel' as any) || 'Entreprise'}
                      </span>
                      <h4 className="mt-1 text-[16px] font-bold text-foreground">
                        {orgData?.companyName || user?.companyName || user?.company || 'Votre Organisation'}
                      </h4>
                    </div>

                    {/* Badges : rôle hiérarchique + statut de vérification */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Rôle hiérarchique */}
                      {(orgData?.isSeniorManager) ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[12px] font-bold text-violet-400">
                          ★ Senior Manager
                        </span>
                      ) : orgData?.orgRole === 'team_manager' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[12px] font-bold text-yellow-500">
                          Manager d&apos;équipe
                        </span>
                      ) : null}
                      {/* Statut de vérification */}
                      {orgData?.isVerified || Boolean(user?.niu) ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[12px] font-bold text-green-400">
                          <ShieldCheck size={14} className="text-green-400" />
                          {t('settings.orgVerifiedBadge' as any) || 'Organisation vérifiée'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[12px] font-semibold text-amber-400">
                          <ShieldAlert size={14} className="text-amber-400" />
                          {t('settings.orgStandardBadge' as any) || 'Organisation standard'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Code Organisation unique */}
                  <div className="mt-2 rounded-xl border border-border bg-secondary/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[12px] font-semibold text-muted-foreground">
                          {t('settings.orgCodeLabel' as any) || 'Code Organisation Unique'}
                        </div>
                        <div className="mt-1 flex items-center gap-2.5">
                          <code className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-[15px] font-extrabold text-primary">
                            {orgData?.orgCode || user?.orgCode || 'Chargement…'}
                          </code>
                          {/* Copier : Senior Manager uniquement */}
                          {isSeniorManager ? (
                            <button
                              type="button"
                              onClick={() => void copyOrgCode()}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[12px] font-semibold text-foreground transition-colors hover:bg-secondary"
                            >
                              {copiedOrgCode ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                              {copiedOrgCode ? (t('settings.copied' as any) || 'Copié !') : (t('settings.copy' as any) || 'Copier')}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                              <Lock size={11} className="shrink-0" />
                              Senior Manager uniquement
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="max-w-[420px] text-[12px] leading-relaxed text-muted-foreground">
                        {isSeniorManager
                          ? (t('settings.orgCodeDesc' as any) || 'Ce code identifie votre entreprise dans Sales Companion. Partagez-le avec d\'autres managers de votre entreprise pour leur permettre de relier leurs équipes et partager des agents support.')
                          : 'Contactez votre Senior Manager pour obtenir le code d\'invitation et rejoindre d\'autres équipes à l\'organisation.'}
                      </p>
                    </div>
                  </div>

                  {/* Liste des managers de l'organisation (visible pour tous) */}
                  {orgData?.managers && orgData.managers.length > 1 && (
                    <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-3">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Managers de l&apos;organisation ({orgData.managers.length})
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {orgData.managers.map((m) => (
                          <div
                            key={m.uid}
                            className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] ${
                              m.isCurrent ? 'bg-primary/8 font-semibold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground">
                                {(m.name?.[0] || '?').toUpperCase()}
                              </div>
                              <span className="truncate text-foreground">{m.name}{m.isCurrent && ' (vous)'}</span>
                            </div>
                            {m.isSenior ? (
                              <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-400">
                                Senior Manager
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-500">
                                Manager
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* NIU Section */}
                <div className="flex flex-col gap-3 border-b border-border pb-6">
                  <h4 className="m-0 text-[14px] font-bold text-foreground">
                    {t('settings.niuTitle' as any) || "Numéro d'Identification Unique (NIU)"}
                  </h4>
                  <p className="m-0 text-[12.5px] leading-relaxed text-muted-foreground">
                    {t('settings.niuDesc' as any) || "Renseignez le NIU fiscal officiel de votre société délivré par la DGI (carte de contribuable) pour certifier votre organisation et garantir la synchronisation avec vos autres comptes managers."}
                  </p>

                  {isSeniorManager ? (
                    /* Formulaire NIU : Senior Manager uniquement */
                    <form onSubmit={handleUpdateNiu} className="flex max-w-[420px] flex-col gap-2.5">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Ex: M051212345678A"
                          value={niuInput}
                          onChange={(e) => setNiuInput(e.target.value.toUpperCase())}
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          loading={niuLoading}
                          style={{ flexShrink: 0 }}
                        >
                          {t('settings.saveBtn' as any) || 'Enregistrer'}
                        </Button>
                      </div>
                      {niuError && <div className="text-[12px] text-red-400">{niuError}</div>}
                      {niuSuccess && <div className="text-[12px] text-green-400">{niuSuccess}</div>}
                    </form>
                  ) : (
                    /* Team Manager : lecture seule */
                    <div className="flex max-w-[420px] items-center gap-3 rounded-xl border border-border bg-secondary/40 p-3.5">
                      <Lock size={16} className="shrink-0 text-muted-foreground" />
                      <div>
                        {orgData?.niu ? (
                          <>
                            <div className="text-[13px] font-semibold text-foreground font-mono">{orgData.niu}</div>
                            <div className="text-[11px] text-muted-foreground">NIU enregistré par le Senior Manager</div>
                          </>
                        ) : (
                          <div className="text-[12.5px] text-muted-foreground">
                            Le NIU fiscal est géré exclusivement par le <strong className="text-foreground">Senior Manager</strong> de votre organisation.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rejoindre une organisation existante */}
                <div className="flex flex-col gap-3">
                  <h4 className="m-0 text-[14px] font-bold text-foreground">
                    {t('settings.joinOrgTitle' as any) || "Rattacher ce compte à une organisation existante"}
                  </h4>
                  <p className="m-0 text-[12.5px] leading-relaxed text-muted-foreground">
                    {t('settings.joinOrgDesc' as any) || "Si un autre manager de votre entreprise s'est déjà inscrit et possède un code organisation (ex: SC-CM-XXXXX), saisissez-le ici pour unifier votre entreprise."}
                  </p>

                  <form onSubmit={handleJoinOrg} className="flex max-w-[420px] flex-col gap-2.5">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Code ex: SC-CM-7K9P2"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        loading={joinLoading}
                        disabled={!joinCodeInput.trim()}
                        style={{ flexShrink: 0 }}
                      >
                        {t('settings.joinBtn' as any) || 'Rattacher'}
                      </Button>
                    </div>
                    {joinError && <div className="text-[12px] text-red-400">{joinError}</div>}
                    {joinSuccess && <div className="text-[12px] text-green-400">{joinSuccess}</div>}
                  </form>

                  {/* Bouton d'invitation (Senior Manager only) */}
                  {orgData?.isSeniorManager && orgData.orgCode && (
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="text-[12px] font-semibold text-muted-foreground">
                        Inviter un Manager dans votre organisation
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const link = `${window.location.origin}/register?role=manager&org=${orgData.orgCode}`
                            void navigator.clipboard.writeText(link).then(() => {
                              window.alert('✓ Lien d\'invitation copié : ' + link)
                            })
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/20"
                        >
                          🔗 Copier le lien d&apos;invitation
                        </button>
                        <p className="text-[11px] text-muted-foreground">
                          Partagez ce lien à vos collègues managers. Ils rejoindront directement votre organisation lors de leur inscription.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </DataCard>
          )}

          {/* ── Équipe de l'Organisation (Senior Manager uniquement) ── */}
          {user?.role === 'manager' && isSeniorManager && orgData?.managers && orgData.managers.length > 0 && (
            <DataCard
              title="Gestion de l'Équipe Organisation"
              subtitle="Vue consolidée de tous les managers rattachés à votre organisation et leurs performances pipeline."
            >
              <OrgManagersSection
                managers={orgData.managers as any}
                orgCode={orgData.orgCode}
              />
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
                  {t('settings.currentEmailLabel')} <strong className="text-foreground">{user?.email}</strong>
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
                      <div className="text-[12px] text-blue-400">{emailSuccess}</div>
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
                      <div className="text-[12px] text-blue-400">{pwSuccess}</div>
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
