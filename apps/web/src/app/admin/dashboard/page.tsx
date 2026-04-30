'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState } from '@/components/feedback/index'
import { ErrorState } from '@/components/feedback/index'
import { StatsGrid, MetricCard, DataCard } from '@/components/ui/index'
import { AdminStatsCards } from '@/features/admin/components/AdminStatsCards'
import { useAdminStats } from '@/features/admin/hooks/useAdminStats'

export default function AdminDashboardPage() {
  const statsQuery = useAdminStats()

  return (
    <AppShell>
      <PageHeader
        title="Dashboard admin"
        subtitle="Vue consolidée des statistiques de la plateforme."
      />

      <DataCard title="Statistiques globales">
        {statsQuery.isLoading ? <LoadingState /> : null}
        {statsQuery.isError ? (
          <ErrorState description="Impossible de charger les statistiques admin." />
        ) : null}
        {statsQuery.data ? <AdminStatsCards stats={statsQuery.data} /> : null}
      </DataCard>
    </AppShell>
  )
}
