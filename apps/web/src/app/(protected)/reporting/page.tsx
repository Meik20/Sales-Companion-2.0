'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { routes } from '@/constants/routes'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, EmptyState } from '@/components/feedback/index'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useReportingData } from '@/features/reporting/hooks/useReportingData'
import { ReportingDashboard } from '@/features/reporting/components/ReportingDashboard'
import { BarChart2, RefreshCw, ShieldAlert, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/providers/I18nProvider'

export default function ReportingPage() {
  const { user } = useCurrentUser()
  const router = useRouter()
  const { t } = useTranslation()
  const isSeniorManager = user?.role === 'manager' && user?.orgRole === 'senior_manager'

  // Rediriger le Senior Manager vers le Dashboard Organisation consolidé (/dashboard)
  useEffect(() => {
    if (isSeniorManager) {
      router.replace(routes.dashboard)
    }
  }, [isSeniorManager, router])

  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const { data, isLoading, isError, error, refetch, isFetching } = useReportingData(selectedPeriod || undefined)

  if (isSeniorManager) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    )
  }

  if (user?.role !== 'manager') {
    return (
      <AppShell>
        <EmptyState
          illustration="/illustrations/empty-states/no-access.png"
          illustrationSize="md"
          title={t('reporting.accessReserved')}
          description={t('reporting.accessReservedDesc')}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader
        title={t('reporting.title')}
        subtitle={t('reporting.subtitle')}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw
              size={14}
              style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }}
            />
            {t('reporting.refresh')}
          </Button>
        }
      />

      {/* Last updated info */}
      {data && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted-foreground, #64748b)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <BarChart2 size={12} />
          {t('reporting.realTimeInfo', { count: data.totalItems })}
        </div>
      )}

      {isLoading && <LoadingState />}

      {isError && (
        <div className="mx-auto my-8 max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <ShieldAlert size={28} />
          </div>
          <h3 className="mb-2 text-lg font-bold text-foreground">
            {user?.plan === 'free'
              ? 'Accès au tableau de bord réservé aux forfaits payants'
              : 'Synchronisation des données en cours'}
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            {user?.orgRole === 'team_manager'
              ? "En tant que Team Manager, votre accès est rattaché au plan de votre organisation. Si votre Senior Manager a activé le forfait Enterprise, la synchronisation est automatique. Cliquez sur Réessayer ou retournez à votre pipeline commercial."
              : user?.plan === 'free'
                ? "Le suivi de performance et les statistiques d'équipe nécessitent un abonnement actif (Pro ou Enterprise). Activez votre plan pour débloquer votre tableau de bord."
                : "Une indisponibilité temporaire empêche de charger les statistiques. Vos données restent en sécurité. Vous pouvez réessayer l'actualisation."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="flex items-center gap-2"
            >
              <RefreshCw
                size={14}
                className={isFetching ? 'animate-spin' : ''}
              />
              Réessayer l&apos;actualisation
            </Button>
            {user?.orgRole === 'team_manager' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(routes.pipeline)}
                className="flex items-center gap-2"
              >
                Retourner à mon pipeline
                <ArrowRight size={14} />
              </Button>
            ) : user?.plan === 'free' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(routes.upgrade)}
                className="flex items-center gap-2"
              >
                Voir les forfaits
                <ArrowRight size={14} />
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {!isLoading && !isError && !data && (
        <EmptyState
          illustration="/illustrations/empty-states/empty-pipeline.png"
          illustrationSize="md"
          title={t('reporting.noData')}
          description={t('reporting.noDataDesc')}
        />
      )}

      {data && (
        <ReportingDashboard
          data={data}
          selectedPeriod={selectedPeriod || data.monthlyCycle?.currentPeriod?.key}
          onSelectPeriod={setSelectedPeriod}
        />
      )}
    </AppShell>
  )
}
