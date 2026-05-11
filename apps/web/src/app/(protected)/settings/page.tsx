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
  free:       { labelKey: 'settings.plans.free',       searches: 50,    featureKeys: ['settings.features.basicSearch', 'settings.features.personalPipeline', 'settings.features.fiftySearches'] },
  starter:    { labelKey: 'settings.plans.starter',    searches: 200,   featureKeys: ['settings.features.advancedSearch', 'settings.features.personalPipeline', 'settings.features.twoHundredSearches', 'settings.features.excelExport'] },
  pro:        { labelKey: 'settings.plans.pro',        searches: 1000,  featureKeys: ['settings.features.allStarter', 'settings.features.teamManagement', 'settings.features.oneThousandSearches', 'settings.features.aiAssistant', 'settings.features.prioritySupport'] },
  enterprise: { labelKey: 'settings.plans.enterprise', searches: 99999, featureKeys: ['settings.features.allPro', 'settings.features.unlimited', 'settings.features.dedicatedDeployment', 'settings.features.dedicatedSupport'] },
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { pushToast } = useToast()
  const router = useRouter()

  const plan = user?.plan ?? 'free'
  const planInfo = planDetails[plan as keyof typeof planDetails] ?? planDetails.free

  return (
    <main>
      <AppShell>
        <PageHeader
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Plan actuel */}
          <DataCard title={t('settings.currentSubscription')}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                marginBottom: 20,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: colors.text, fontFamily: "'Syne',sans-serif" }}>
                    {t('settings.planLabel')} {t(planInfo.labelKey as any)}
                  </span>
                  <Badge variant={plan === 'enterprise' ? 'gold' : plan === 'pro' ? 'success' : 'default'}>
                    {t(planInfo.labelKey as any)}
                  </Badge>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>
                  {planInfo.searches === 99999 ? t('settings.unlimitedSearches') : `${planInfo.searches} ${t('settings.searchesPerDay')}`}
                </p>
              </div>

              {plan !== 'enterprise' ? (
                <button
                  onClick={() => router.push(routes.upgrade)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 18px',
                    borderRadius: 10,
                    background: '#1B7A3E',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1px solid #2ea05a',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                >
                  ⬆️ {t('settings.upgradeBtn')}
                </button>
              ) : null}
            </div>

            {/* Fonctionnalités incluses */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {planInfo.featureKeys.map((fk) => (
                <span
                  key={fk}
                  style={{
                    padding: '5px 12px',
                    background: 'rgba(27,122,62,0.1)',
                    border: '1px solid rgba(27,122,62,0.2)',
                    borderRadius: 999,
                    fontSize: 12,
                    color: '#4ade80',
                    fontWeight: 500,
                  }}
                >
                  ✓ {t(fk as any)}
                </span>
              ))}
            </div>
          </DataCard>



          {/* Infos compte */}
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
