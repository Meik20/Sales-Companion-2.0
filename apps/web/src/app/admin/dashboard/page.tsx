'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, ErrorState } from '@/components/feedback/index'
import { AdminStatsCards } from '@/features/admin/components/AdminStatsCards'
import { useAdminStats } from '@/features/admin/hooks/useAdminStats'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { colors, shadows } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

/* ── SVG Bar Chart ── */
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const h = 120
  return (
    <svg width="100%" height={h + 40} viewBox={`0 0 ${data.length * 70} ${h + 40}`} preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const barH = Math.max(4, (d.value / max) * h)
        const x = i * 70 + 10
        const y = h - barH
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={50} height={barH} rx={6} fill={d.color} opacity={0.85} />
            <text x={x + 25} y={y - 6} textAnchor="middle" fontSize={11} fontWeight="700" fill={d.color}>
              {d.value}
            </text>
            <text x={x + 25} y={h + 18} textAnchor="middle" fontSize={10} fill={colors.textMid}>
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── SVG Donut Chart ── */
function DonutChart({ segments, totalOverride }: { segments: { label: string; value: number; color: string }[]; totalOverride?: number }) {
  const total = totalOverride ?? (segments.reduce((s, d) => s + d.value, 0) || 1)
  const cx = 80, cy = 80, r = 60, stroke = 28
  let cumAngle = -90

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        {segments.map((seg, i) => {
          const pct = seg.value / total
          const angle = pct * 360
          const startAngle = cumAngle
          cumAngle += angle
          const start = polarToCartesian(cx, cy, r, startAngle)
          const end = polarToCartesian(cx, cy, r, cumAngle - 0.01)
          const large = angle > 180 ? 1 : 0
          const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              opacity={0.85}
            />
          )
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={20} fontWeight="800" fill={colors.text}>
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill={colors.textMid}>
          TOTAL
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
            <span style={{ color: colors.textMid }}>{seg.label}</span>
            <span style={{ fontWeight: 700, color: colors.text, marginLeft: 'auto', minWidth: 24, textAlign: 'right' }}>
              {seg.value}
            </span>
            <span style={{ color: colors.textDim, fontSize: 10 }}>
              ({Math.round((seg.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/* ── Chart Card wrapper ── */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 14,
      padding: 24,
      boxShadow: shadows.sm,
    }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: colors.text,
        marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${colors.border}`,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

/* ── KPI Trend Card ── */
function TrendCard({ label, value, hint, trend, color }: {
  label: string; value: number; hint?: string; trend?: string; color: string
}) {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 14,
      padding: '20px 24px',
      boxShadow: shadows.sm,
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMid, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>
        {value.toLocaleString('fr-FR')}
      </div>
      {hint && <div style={{ fontSize: 12, color: colors.textMid, marginTop: 6 }}>{hint}</div>}
      {trend && <div style={{ fontSize: 11, color: colors.green, marginTop: 4, fontWeight: 600 }}>{trend}</div>}
    </div>
  )
}

/* ── Page principale ── */
export default function AdminDashboardPage() {
  const statsQuery = useAdminStats()
  const stats = statsQuery.data
  const { user } = useCurrentUser()
  const { t } = useTranslation()

  // Raison sociale : companyName du profil admin (depuis Firestore)
  const companyLabel = user?.companyName
    ? `🏢 ${user.companyName}`
    : t('admin.dashboardSubtitle')

  const roleData = [
    { label: t('admin.members'), value: stats?.roleDistribution?.member || 0, color: '#60a5fa' },
    { label: t('admin.managers'), value: stats?.roleDistribution?.manager || 0, color: '#34d399' },
    { label: t('admin.indep'), value: stats?.roleDistribution?.independent || 0, color: '#c084fc' },
    { label: t('admin.admins'), value: stats?.roleDistribution?.admin || 0, color: '#facc15' },
  ]

  const planData = [
    { label: 'Free', value: stats?.planDistribution?.FREE || 0, color: '#9ca3af' },
    { label: 'Starter', value: stats?.planDistribution?.STARTER || 0, color: '#60a5fa' },
    { label: 'Pro', value: stats?.planDistribution?.PRO || 0, color: '#34d399' },
    { label: 'Enterprise', value: stats?.planDistribution?.ENTERPRISE || 0, color: '#facc15' },
  ]

  return (
    <AppShell>
      <PageHeader
        title={t('admin.dashboardTitle')}
        subtitle={companyLabel}
      />

      {statsQuery.isLoading ? <LoadingState /> : null}
      {statsQuery.isError ? <ErrorState description={t('admin.loadingStats')} /> : null}

      {stats ? (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <TrendCard
              label={t('admin.users')}
              value={stats.totalUsers ?? 0}
              hint={`${stats.activeUsers ?? 0} ${t('admin.activeThisWeek')}`}
              trend={`+${stats.newUsersThisWeek ?? 0} ${t('admin.thisWeek')}`}
              color={colors.green}
            />
            <TrendCard
              label={t('admin.companies')}
              value={stats.totalCompanies ?? 0}
              hint={t('admin.inDatabase')}
              color={colors.info}
            />
            <TrendCard
              label={t('admin.pipelineItems')}
              value={stats.totalPipelineItems ?? 0}
              hint={t('admin.allReps')}
              color={colors.gold}
            />
            <TrendCard
              label={t('admin.searchesToday')}
              value={stats.totalSearchesToday ?? 0}
              hint={t('admin.acrossPlatform')}
              color="#8b5cf6"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <ChartCard title={t('admin.usersByRole')}>
              <BarChart data={roleData} />
            </ChartCard>
            <ChartCard title={t('admin.plansDistribution')}>
              <DonutChart segments={planData} totalOverride={stats.totalUsers} />
            </ChartCard>
          </div>

          {/* Activity timeline (simplified) */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: 24,
            boxShadow: shadows.sm,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${colors.border}` }}>
              {t('admin.recentActivity')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { icon: '👥', label: t('admin.newUsers'), value: stats.newUsersThisWeek ?? 0, unit: t('admin.thisWeek'), color: colors.green },
                { icon: '🔍', label: t('admin.searches'), value: stats.totalSearchesToday ?? 0, unit: t('admin.today'), color: colors.info },
                { icon: '📊', label: t('admin.activationRate'), value: stats.totalUsers ? Math.round(((stats.activeUsers ?? 0) / stats.totalUsers) * 100) : 0, unit: t('admin.activePct'), color: colors.gold },
                { icon: '🏢', label: t('admin.companiesPerUser'), value: stats.totalUsers ? Math.round((stats.totalCompanies ?? 0) / stats.totalUsers) : 0, unit: t('admin.avg'), color: '#8b5cf6' },
              ].map((item) => (
                <div key={item.label} style={{
                  background: colors.bg3,
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}<span style={{ fontSize: 11, color: colors.textMid, marginLeft: 4 }}>{item.unit}</span></div>
                    <div style={{ fontSize: 11, color: colors.textMid }}>{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
