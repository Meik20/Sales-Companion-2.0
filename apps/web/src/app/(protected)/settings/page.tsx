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

          {/* ── Compte ──────────────────────────────────────────── */}
          {user?.role !== 'manager' ? (
            <DataCard title={t('settings.account')}>
              <EmptyState
                title={t('settings.noAdvancedParams')}
                description={t('settings.managerUpgradeHint')}
                icon="⚙️"
              />
            </DataCard>
          ) : null}
        </div>
      </AppShell>
    </main>
  )
}
