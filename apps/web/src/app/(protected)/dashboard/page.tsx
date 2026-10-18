'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataCard } from '@/components/ui/index'
import { LoadingState } from '@/components/feedback/index'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  useOrgReport,
  type OrgReportManager,
  type OrgRecentActivity
} from '@/features/pipeline/hooks/useOrgReport'
import { useTranslation } from '@/providers/I18nProvider'
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
  RefreshCw,
  Medal
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
  const strVal = String(value)
  let mainNumber = strVal
  let suffix = ''

  if (strVal.endsWith('%')) {
    mainNumber = strVal.replace('%', '')
    suffix = '%'
  }

  return (
    <div
      style={{
        background: 'var(--card, #ffffff)',
        border: '1px solid var(--border, rgba(0,0,0,0.08))',
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 128,
        boxShadow: 'var(--shadow-elevation-1)',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-elevation-2)'
        e.currentTarget.style.borderColor = `${color}66`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--shadow-elevation-1)'
        e.currentTarget.style.borderColor = 'var(--border, rgba(0,0,0,0.08))'
      }}
    >
      {/* Top micro-gradient indicator */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${color}, ${color}22)`
        }}
      />

      {/* Header: Label + Vector Icon Squircle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--muted-foreground, #64748b)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: `${color}15`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div style={{ margin: '2px 0 6px', display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span
          style={{
            fontSize: 27,
            fontWeight: 800,
            color: 'var(--foreground, #0f172a)',
            fontFamily: 'var(--font-heading, sans-serif)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em'
          }}
        >
          {mainNumber}
        </span>
        {suffix && (
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: color
            }}
          >
            {suffix}
          </span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{ fontSize: 11.5, color: 'var(--muted-foreground, #64748b)', lineHeight: 1.3 }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

// ── Top Performer Row ──────────────────────────────────────────────────────
function TopPerformerRow({ rank, manager }: { rank: number; manager: OrgReportManager }) {
  const medalColor =
    rank === 1
      ? '#fbbf24'
      : rank === 2
        ? '#94a3b8'
        : rank === 3
          ? '#cd7c3d'
          : 'var(--muted-foreground)'
  const medalIcon =
    rank === 1 ? <Medal size={18} style={{ color: '#fbbf24' }} /> :
    rank === 2 ? <Medal size={18} style={{ color: '#94a3b8' }} /> :
    rank === 3 ? <Medal size={18} style={{ color: '#cd7c3d' }} /> :
    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted-foreground)' }}>#{rank}</span>

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--border)'
      }}
    >
      {/* Rang */}
      <div style={{ width: 28, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{medalIcon}</div>

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
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--foreground)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
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
            <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: 'var(--font-heading, sans-serif)' }}>
              {value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Activité Récente ───────────────────────────────────────────────────────
function ActivityItem({ activity, lang }: { activity: OrgRecentActivity; lang: string }) {
  const date = activity.updatedAt
    ? new Date(activity.updatedAt).toLocaleDateString(
        lang === 'en' ? 'en-US' : 'fr-FR',
        { day: '2-digit', month: 'short' }
      )
    : '—'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid var(--border)'
      }}
    >
      <CheckCircle2 size={14} color="#34d399" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--foreground)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {activity.companyName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
          via {activity.managerName}
          {activity.memberName ? ` · ${activity.memberName}` : ''}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0 }}>{date}</div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useCurrentUser()
  const router = useRouter()
  const { t, lang } = useTranslation()
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
        title={t('dashboard.title')}
        subtitle={`${t('dashboard.subtitlePrefix')} · ${data?.orgCode ?? '…'}`}
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
            {orgReportQuery.isFetching ? t('dashboard.refreshing') : t('dashboard.refresh')}
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              marginBottom: 24
            }}
          >
            <KpiCard
              label={t('dashboard.kpiManagers')}
              value={data?.totalManagers ?? 0}
              color="#8b5cf6"
              icon={<Users2 size={16} />}
              subtitle={t('dashboard.kpiManagersSub')}
            />
            <KpiCard
              label={t('dashboard.kpiProspection')}
              value={data?.globalCounts.prospection ?? 0}
              color="#3b82f6"
              icon={<TrendingUp size={16} />}
              subtitle={t('dashboard.kpiProspectionSub')}
            />
            <KpiCard
              label={t('dashboard.kpiNegociation')}
              value={data?.globalCounts.negociation ?? 0}
              color="#f59e0b"
              icon={<Filter size={16} />}
              subtitle={t('dashboard.kpiNegociationSub')}
            />
            <KpiCard
              label={t('dashboard.kpiConclus')}
              value={data?.globalCounts.conclue ?? 0}
              color="#10b981"
              icon={<CheckCircle2 size={16} />}
              subtitle={t('dashboard.kpiConclusSub')}
            />
            <KpiCard
              label={t('dashboard.kpiTotal')}
              value={data?.globalCounts.total ?? 0}
              color="#6366f1"
              icon={<BarChart3 size={16} />}
              subtitle={t('dashboard.kpiTotalSub')}
            />
            <KpiCard
              label={t('dashboard.kpiRate')}
              value={`${data?.conversionRate ?? 0}%`}
              color="#0ea5e9"
              icon={<Trophy size={16} />}
              subtitle={t('dashboard.kpiRateSub')}
            />
          </div>

          {/* ── Corps en 2 colonnes (responsive: 1 col sur mobile, 2 cols sur desktop) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Performers */}
            <DataCard
              title={t('dashboard.topPerformers')}
              actions={
                <InfoTooltip
                  placement="left"
                  content={t('dashboard.topPerformersTooltip')}
                />
              }
            >
              {!data?.managers?.length ? (
                <div
                  style={{
                    padding: '20px 0',
                    textAlign: 'center',
                    color: 'var(--muted-foreground)',
                    fontSize: 13
                  }}
                >
                  {t('dashboard.noData')}
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
              title={t('dashboard.recentActivity')}
              actions={
                <InfoTooltip
                  placement="left"
                  content={t('dashboard.recentActivityTooltip')}
                />
              }
            >
              {!data?.recentActivity?.length ? (
                <div
                  style={{
                    padding: '20px 0',
                    textAlign: 'center',
                    color: 'var(--muted-foreground)',
                    fontSize: 13
                  }}
                >
                  {t('dashboard.noActivity')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {data.recentActivity.map((a) => (
                    <ActivityItem key={a.id} activity={a} lang={lang} />
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
