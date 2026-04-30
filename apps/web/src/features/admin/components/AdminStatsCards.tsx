import { StatsGrid, MetricCard } from '@/components/ui/index'

type Stats = {
  totalUsers?: number
  totalCompanies?: number
  totalPipelineItems?: number
  totalSearchesToday?: number
  activeUsers?: number
  newUsersThisWeek?: number
}

type Props = { stats: Stats }

export function AdminStatsCards({ stats }: Props) {
  return (
    <StatsGrid>
      <MetricCard
        label="Utilisateurs"
        value={stats.totalUsers ?? 0}
        hint={stats.activeUsers !== undefined ? `${stats.activeUsers} actifs` : undefined}
        accent
      />
      <MetricCard
        label="Entreprises"
        value={stats.totalCompanies ?? 0}
        hint="Dans la base de données"
      />
      <MetricCard
        label="Items pipeline"
        value={stats.totalPipelineItems ?? 0}
        hint="Tous les commerciaux"
      />
      <MetricCard
        label="Recherches aujourd'hui"
        value={stats.totalSearchesToday ?? 0}
        hint="Sur l'ensemble de la plateforme"
      />
      {stats.newUsersThisWeek !== undefined ? (
        <MetricCard
          label="Nouveaux cette semaine"
          value={stats.newUsersThisWeek}
          accent
        />
      ) : null}
    </StatsGrid>
  )
}
