'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataCard, Badge } from '@/components/ui/index'
import { EmptyState } from '@/components/feedback/index'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'
import { colors } from '@/styles/tokens'
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
      setEmailSuccess(`Un e-mail de vérification a été envoyé à ${newEmail}. Veuillez cliquer sur le lien pour confirmer le changement.`)
      setNewEmail('')
    } catch (err: any) {
      setEmailError(err.message || "Erreur lors de la mise à jour de l'e-mail")
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
      setPwSuccess(`Un e-mail de réinitialisation de mot de passe a été envoyé à ${user.email}`)
    } catch (err: any) {
      setPwError(err.message || "Erreur lors de l'envoi de l'e-mail")
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
      title: `Thème "${design === 'firebase' ? '🔥 Firebase Console' : '💼 LinkedIn'}" activé`
    })
  }

  const themes: { id: DesignTheme; label: string; desc: string; swatches: string[]; accent: string }[] = [
    {
      id: 'linkedin',
      label: 'LinkedIn Design',
      desc: 'Épuré et professionnel. Bleu LinkedIn, arrondis discrets.',
      swatches: ['#0a66c2', '#f3f2ef', '#ffffff'],
      accent: '#0a66c2'
    },
    {
      id: 'firebase',
      label: 'Firebase Console',
      desc: 'Amber & Navy. Dark-first, moderne et technique.',
      swatches: ['#FFA611', '#1967D2', '#1C1F27'],
      accent: '#FFA611'
    }
  ]

  return (
    <main>
      <AppShell>
        <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Apparence ───────────────────────────────────────── */}
          <DataCard title="Apparence" subtitle="Personnalisez le style visuel de votre interface">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Cartes de thème */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12
              }}>
                {themes.map((th) => {
                  const isActive = activeDesign === th.id
                  return (
                    <button
                      key={th.id}
                      id={`design-theme-${th.id}`}
                      onClick={() => handleDesignChange(th.id)}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 14,
                        border: `2px solid ${isActive ? th.accent : colors.border}`,
                        background: isActive ? `${th.accent}0f` : colors.bg2,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 220ms ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        boxShadow: isActive ? `0 0 0 3px ${th.accent}22` : 'none'
                      }}
                    >
                      {/* Swatches */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {th.swatches.map((c, i) => (
                          <span
                            key={i}
                            style={{
                              width: 26, height: 26, borderRadius: 6,
                              background: c,
                              border: c === '#ffffff' || c === '#f3f2ef'
                                ? '1px solid rgba(0,0,0,0.12)'
                                : 'none',
                              display: 'block',
                              transition: 'transform 150ms ease',
                              transform: isActive ? 'scale(1.1)' : 'scale(1)'
                            }}
                          />
                        ))}
                      </div>

                      {/* Label + badge actif */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <strong style={{ fontSize: 13, color: colors.text }}>{th.label}</strong>
                          {isActive && (
                            <span style={{
                              fontSize: 9, fontWeight: 800,
                              color: th.accent,
                              background: `${th.accent}20`,
                              padding: '2px 7px',
                              borderRadius: 99,
                              letterSpacing: '0.4px'
                            }}>
                              ACTIF
                            </span>
                          )}
                        </div>
                        <p style={{
                          fontSize: 11.5, color: colors.textMid,
                          margin: 0, lineHeight: 1.5
                        }}>
                          {th.desc}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Barre de switch rapide */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
                padding: '12px 16px', borderRadius: 10,
                background: colors.bg3, border: `1px solid ${colors.border}`
              }}>
                <span style={{ fontSize: 13, color: colors.textMid, fontWeight: 500 }}>
                  Thème actif :{' '}
                  <strong style={{ color: colors.text }}>
                    {activeDesign === 'firebase' ? '🔥 Firebase Console' : '💼 LinkedIn Design'}
                  </strong>
                </span>
                <button
                  id="design-theme-toggle"
                  onClick={() => handleDesignChange(activeDesign === 'linkedin' ? 'firebase' : 'linkedin')}
                  style={{
                    padding: '6px 16px', borderRadius: 8,
                    fontSize: 12, fontWeight: 700,
                    border: `1px solid ${colors.border}`,
                    background: colors.bg2, color: colors.text,
                    cursor: 'pointer', transition: 'all 150ms ease'
                  }}
                >
                  Basculer →
                </button>
              </div>
            </div>
          </DataCard>

          {/* ── Abonnement ──────────────────────────────────────── */}
          <DataCard title={t('settings.currentSubscription')}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16, flexWrap: 'wrap', marginBottom: 20
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: colors.text, fontFamily: 'inherit' }}>
                    {t('settings.planLabel')} {t(planInfo.labelKey as any)}
                  </span>
                  <Badge variant={plan === 'enterprise' ? 'gold' : plan === 'pro' ? 'success' : 'default'}>
                    {t(planInfo.labelKey as any)}
                  </Badge>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>
                  {planInfo.searches >= 1000
                    ? t('settings.searchesPerDay1000') || `${planInfo.searches} ${t('settings.searchesPerDay')}`
                    : `${planInfo.searches} ${t('settings.searchesPerDay')}`}
                </p>
              </div>

              {plan !== 'enterprise' && (user?.role === 'manager' || user?.role === 'independent') ? (
                <button
                  onClick={() => router.push(routes.upgrade)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '9px 18px', borderRadius: 10,
                    background: 'var(--color-primary)', color: '#fff',
                    fontSize: 13, fontWeight: 600, border: 'none',
                    cursor: 'pointer', transition: 'all 200ms ease'
                  }}
                >
                  ⬆️ {t('settings.upgradeBtn')}
                </button>
              ) : null}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {planInfo.featureKeys.map((fk) => (
                <span
                  key={fk}
                  style={{
                    padding: '5px 12px', background: 'var(--bg3)',
                    border: '1px solid var(--bd)', borderRadius: 999,
                    fontSize: 12, color: 'var(--tx2)', fontWeight: 500
                  }}
                >
                  ✓ {t(fk as any)}
                </span>
              ))}
            </div>
          </DataCard>

          {/* ── Sécurité & Compte ────────────────────────────────── */}
          <DataCard title="Sécurité & Compte" subtitle="Gérez vos informations de connexion et de sécurité">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Adresse E-mail Section */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                borderBottom: `1px solid ${colors.border}`,
                paddingBottom: 24
              }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.text }}>
                  Adresse e-mail
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>
                  Votre adresse e-mail actuelle est : <strong style={{ color: colors.text }}>{user?.email}</strong>
                </p>
                
                {isGoogleUser ? (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: colors.textMid
                  }}>
                    Votre compte est associé à Google. Les modifications d&apos;adresse e-mail doivent être effectuées depuis votre compte Google.
                  </div>
                ) : (
                  <form onSubmit={handleUpdateEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input
                        type="email"
                        placeholder="Nouvelle adresse e-mail"
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
                        Mettre à jour
                      </Button>
                    </div>
                    {emailError && (
                      <div style={{ fontSize: 12, color: '#f87171' }}>{emailError}</div>
                    )}
                    {emailSuccess && (
                      <div style={{ fontSize: 12, color: colors.greenMid }}>{emailSuccess}</div>
                    )}
                    <span style={{ fontSize: 11, color: colors.textDim }}>
                      Un e-mail de confirmation sera envoyé à la nouvelle adresse pour valider le changement.
                    </span>
                  </form>
                )}
              </div>

              {/* Mot de passe Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.text }}>
                  Mot de passe
                </h3>
                
                {isGoogleUser ? (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: colors.textMid
                  }}>
                    Votre compte est associé à Google. Votre mot de passe est géré de manière sécurisée par Google.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handlePasswordReset()}
                      loading={pwLoading}
                    >
                      Envoyer l&apos;email de réinitialisation
                    </Button>
                    {pwError && (
                      <div style={{ fontSize: 12, color: '#f87171' }}>{pwError}</div>
                    )}
                    {pwSuccess && (
                      <div style={{ fontSize: 12, color: colors.greenMid }}>{pwSuccess}</div>
                    )}
                    <span style={{ fontSize: 11, color: colors.textDim }}>
                      Nous vous enverrons un lien de réinitialisation sécurisé par e-mail.
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
