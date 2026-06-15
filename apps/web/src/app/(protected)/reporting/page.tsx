'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, EmptyState } from '@/components/feedback/index'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useReportingData } from '@/features/reporting/hooks/useReportingData'
import { ReportingDashboard } from '@/features/reporting/components/ReportingDashboard'
import { colors } from '@/styles/tokens'
import { BarChart2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function ReportingPage() {
  const { user } = useCurrentUser()
  const { data, isLoading, isError, error, refetch, isFetching } = useReportingData()

  if (user?.role !== 'manager') {
    return (
      <AppShell>
        <EmptyState
          title="Accès réservé"
          description="Cette section est réservée aux managers. Contactez votre responsable pour y accéder."
          icon="🔒"
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader
        title="Tableau de bord"
        subtitle="Performances commerciales de votre équipe en temps réel"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
            Actualiser
          </Button>
        }
      />

      {/* Last updated info */}
      {data && (
        <div style={{ fontSize: 11, color: colors.textDim, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart2 size={12} />
          Données en temps réel · {data.totalItems} prospects analysés
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
          <strong>Erreur :</strong> {error instanceof Error ? error.message : 'Impossible de charger les données'}
        </div>
      )}

      {!isLoading && !isError && !data && (
        <EmptyState
          title="Aucune donnée"
          description="Votre équipe n'a pas encore enregistré de prospects. Les statistiques apparaîtront ici dès que l'activité commence."
          icon="📊"
        />
      )}

      {data && <ReportingDashboard data={data} />}
    </AppShell>
  )
}
