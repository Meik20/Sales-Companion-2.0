'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataCard } from '@/components/ui/index'
import { LoadingState } from '@/components/feedback/index'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useOrgReport, type OrgReportManager, type OrgRecentActivity } from '@/features/pipeline/hooks/useOrgReport'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  Crown,
  Users2,
  TrendingUp,
  Filter,
  CheckCircle2,
  BarChart3,
  Trophy,
  Clock,
  Building2,
  RefreshCw
} from 'lucide-react'

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  color,
  icon,
  subtitle
}: {
  label: string
  value: number | string
  color: string
  icon: React.ReactNode
  subtitle?: string
}) {
  return (
    <div
      style={{
        background: 'var(--card, #131c2e)',
        border: '1px solid var(--border, rgba(255,255,255,0.1))',
        borderRadius: 14,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
        <span style={{ color, opacity: 0.8 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 36, fontWeight: 900, color, fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{subtitle}</div>
      )}
    </div>
  )
}

// ── Top Performer Row ──────────────────────────────────────────────────────
function TopPerformerRow({
  rank,
  manager
}: {
  rank: number
  manager: OrgReportManager
}) {
  const medalColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : rank === 3 ? '#cd7c3d' : 'var(--muted-foreground)'
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Rang */}
      <div style={{ width: 28, textAlign: 'center', fontSize: 18, flexShrink: 0 }}>{medal}</div>

      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: manager.isSenior ? 'var(--primary, #6366f1)' : 'var(--secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 14,
          fontWeight: 700,
          color: '#fff'
        }}
      >
        {(manager.name || manager.email || '?').charAt(0).toUpperCase()}
      </div>

      {/* Nom */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {manager.name || manager.email}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
          {manager.isSenior ? 'Senior Manager' : 'Team Manager'}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
        {[
          { label: 'P', value: manager.stats.prospection, color: '#60a5fa' },
          { label: 'N', value: manager.stats.negociation, color: '#fbbf24' },
          { label: 'C', value: manager.stats.conclue, color: '#34d399' }
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'Syne',sans-serif" }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Activité Récente ───────────────────────────────────────────────────────
function ActivityItem({ activity }: { activity: OrgRecentActivity }) {
  const date = activity.updatedAt
    ? new Date(activity.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    : '—'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <CheckCircle2 size={14} color="#34d399" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {activity.companyName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
          via {activity.managerName}
          {activity.memberName ? ` · ${activity.memberName}` : ''}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0 }}>
        {date}
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useCurrentUser()
  const router = useRouter()
  const isSeniorManager = user?.role === 'manager' && user?.orgRole === 'senior_manager'

  // Rediriger si pas Senior Manager
  useEffect(() => {
    if (user && !isSeniorManager) {
      router.replace('/reporting')
    }
  }, [user, isSeniorManager, router])

  const orgReportQuery = useOrgReport()
  const data = orgReportQuery.data

  if (!user || !isSeniorManager) return null

  return (
    <AppShell>
      <PageHeader
        title="Tableau de Bord Organisation"
        subtitle={`Vue consolidée de votre organisation · ${data?.orgCode ?? '…'}`}
        actions={
          <button
            type="button"
            onClick={() => void orgReportQuery.refetch()}
            disabled={orgReportQuery.isFetching}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted-foreground)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={orgReportQuery.isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>
        }
      />

      {orgReportQuery.isLoading ? (
        <LoadingState />
      ) : (
        <>
          {/* ── KPIs globaux ────────────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginBottom: 24
            }}
          >
            <KpiCard
              label="Managers"
              value={data?.totalManagers ?? 0}
              color="#a78bfa"
              icon={<Users2 size={18} />}
              subtitle="dans votre organisation"
            />
            <KpiCard
              label="Prospection"
              value={data?.globalCounts.prospection ?? 0}
              color="#60a5fa"
              icon={<TrendingUp size={18} />}
              subtitle="prospects en cours"
            />
            <KpiCard
              label="Négociation"
              value={data?.globalCounts.negociation ?? 0}
              color="#fbbf24"
              icon={<Filter size={18} />}
              subtitle="en négociation"
            />
            <KpiCard
              label="Conclus"
              value={data?.globalCounts.conclue ?? 0}
              color="#34d399"
              icon={<CheckCircle2 size={18} />}
              subtitle="contrats signés"
            />
            <KpiCard
              label="Total Pipeline"
              value={data?.globalCounts.total ?? 0}
              color="#f472b6"
              icon={<BarChart3 size={18} />}
              subtitle="prospects au total"
            />
            <KpiCard
              label="Taux de Conversion"
              value={`${data?.conversionRate ?? 0}%`}
              color="#fb923c"
              icon={<Trophy size={18} />}
              subtitle="conclus / total"
            />
          </div>

          {/* ── Corps en 2 colonnes ─────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Top Performers */}
            <DataCard
              title="Top Performers"
              subtitle="Managers classés par nombre de prospects conclus"
            >
              {!data?.managers?.length ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
                  Aucune donnée disponible
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {data.managers.map((mgr, i) => (
                    <TopPerformerRow key={mgr.uid} rank={i + 1} manager={mgr} />
                  ))}
                </div>
              )}
            </DataCard>

            {/* Activité Récente */}
            <DataCard
              title="Activité Récente"
              subtitle="10 derniers prospects conclus dans l'organisation"
            >
              {!data?.recentActivity?.length ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
                  Aucune activité récente
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {data.recentActivity.map((a) => (
                    <ActivityItem key={a.id} activity={a} />
                  ))}
                </div>
              )}
            </DataCard>
          </div>


        </>
      )}
    </AppShell>
  )
}
