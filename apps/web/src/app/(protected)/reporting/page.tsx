'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, EmptyState } from '@/components/feedback/index'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useReportingData } from '@/features/reporting/hooks/useReportingData'
import { ReportingDashboard } from '@/features/reporting/components/ReportingDashboard'
import { BarChart2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/providers/I18nProvider'

export default function ReportingPage() {
  const { user } = useCurrentUser()
  const { t } = useTranslation()
  const { data, isLoading, isError, error, refetch, isFetching } = useReportingData()

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
        <div
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12,
            padding: '20px 24px',
            color: '#f87171',
            fontSize: 14
          }}
        >
          <strong>Erreur :</strong>{' '}
          {error instanceof Error ? error.message : t('reporting.errorLoading')}
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

      {data && <ReportingDashboard data={data} />}
    </AppShell>
  )
}
