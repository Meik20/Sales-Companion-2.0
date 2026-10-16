'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ReportingData, MemberStat, SupportAgentStat } from '../hooks/useReportingData'
import { useTranslation } from '@/providers/I18nProvider'
import {
  Target,
  Handshake,
  Trophy,
  MapPin,
  Building2,
  Calendar,
  AlertTriangle,
  X,
  Phone,
  Ticket,
  Users,
  BarChart3,
  Headphones,
  Banknote,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Clock,
  Medal,
  ChevronRight,
  Check
} from 'lucide-react'

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  color: string
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; className?: string }>
  badge?: { text: string; color?: string; bg?: string }
  isPerson?: boolean
}

function KpiCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
  badge,
  isPerson
}: KpiCardProps) {
  const { t } = useTranslation()
  const isRetard = label.toLowerCase().includes('retard') || label.toLowerCase().includes('overdue')
  const numVal = typeof value === 'number' ? value : Number(value)
  const isZeroRetard = isRetard && (value === 0 || value === '0')
  const hasRetard = isRetard && !isZeroRetard && !isNaN(numVal) && numVal > 0

  // Person detection: either flag or "top commercial" / "top sales" label
  const isPersonCard = isPerson || label.toLowerCase().includes('top commercial') || label.toLowerCase().includes('top sales')

  // Check if string ends with F, FCFA, or %
  const strVal = String(value ?? '—')
  let mainNumber = strVal
  let suffix = ''

  if (strVal.endsWith(' FCFA')) {
    mainNumber = strVal.replace(' FCFA', '')
    suffix = 'FCFA'
  } else if (strVal.endsWith(' F')) {
    mainNumber = strVal.replace(' F', '')
    suffix = 'FCFA'
  } else if (strVal.endsWith('%')) {
    mainNumber = strVal.replace('%', '')
    suffix = '%'
  }

  // Get initials for person
  let initials = ''
  if (isPersonCard && strVal && strVal !== '—') {
    initials = strVal
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('')
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
        minHeight: 132,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 4px 14px -2px rgba(0,0,0,0.02)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 6px 20px -4px rgba(0,0,0,0.08)'
        e.currentTarget.style.borderColor = `${color}66`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03), 0 4px 14px -2px rgba(0,0,0,0.02)'
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 10
        }}
      >
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
          <Icon size={16} strokeWidth={2.2} />
        </div>
      </div>

      {/* Main Metric Value Area */}
      <div style={{ margin: '2px 0 8px' }}>
        {isPersonCard ? (
          strVal && strVal !== '—' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 13,
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.28)',
                  flexShrink: 0
                }}
              >
                {initials || <Trophy size={15} />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--foreground, #0f172a)',
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={strVal}
                >
                  {strVal}
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#d97706',
                    marginTop: 2
                  }}
                >
                  <Trophy size={11} /> {t('reporting.leaderOfMonth')}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted-foreground, #94a3b8)' }}>
              {t('reporting.noClosedDeals')}
            </div>
          )
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
            <span
              style={{
                fontSize: 27,
                fontWeight: 800,
                color: hasRetard ? '#ef4444' : isZeroRetard ? '#10b981' : 'var(--foreground, #0f172a)',
                fontFamily: "'Syne', -apple-system, sans-serif",
                lineHeight: 1.1,
                letterSpacing: '-0.02em'
              }}
            >
              {mainNumber}
            </span>
            {suffix && (
              <span
                style={{
                  fontSize: suffix === '%' ? 17 : 12,
                  fontWeight: 700,
                  color: suffix === '%' ? color : 'var(--muted-foreground, #64748b)',
                  letterSpacing: suffix === '%' ? '-0.01em' : '0.04em'
                }}
              >
                {suffix}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subtext / contextual status */}
      <div
        style={{
          fontSize: 11.5,
          color: 'var(--muted-foreground, #64748b)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          lineHeight: 1.3
        }}
      >
        {isZeroRetard ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#059669',
              fontWeight: 600,
              fontSize: 11
            }}
          >
            <CheckCircle2 size={12} /> À jour · Aucun retard
          </span>
        ) : hasRetard ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#dc2626',
              fontWeight: 600,
              fontSize: 11
            }}
          >
            <AlertTriangle size={12} /> Échéances dépassées
          </span>
        ) : sub ? (
          <span>{sub}</span>
        ) : null}
      </div>
    </div>
  )
}

// ── Pipeline Funnel ───────────────────────────────────────────────────────────
function PipelineFunnel({
  prospection,
  negociation,
  conclue
}: {
  prospection: number
  negociation: number
  conclue: number
}) {
  const { t } = useTranslation()
  const total = prospection + negociation + conclue || 1
  const stages = [
    {
      step: 1,
      label: t('reporting.stageProspection'),
      subtitle: t('reporting.stageProspectionSub'),
      value: prospection,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      icon: Target,
      pct: Math.round((prospection / total) * 100)
    },
    {
      step: 2,
      label: t('reporting.stageNegociation'),
      subtitle: t('reporting.stageNegociationSub'),
      value: negociation,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
      icon: Handshake,
      pct: Math.round((negociation / total) * 100)
    },
    {
      step: 3,
      label: t('reporting.stageConclue'),
      subtitle: t('reporting.stageConclueSub'),
      value: conclue,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      icon: CheckCircle2,
      pct: Math.round((conclue / total) * 100)
    }
  ]

  // Conversion dropoff calculation
  const pToN = (prospection + negociation + conclue) > 0
    ? Math.round(((negociation + conclue) / (prospection + negociation + conclue)) * 100)
    : 0
  const nToC = (negociation + conclue) > 0
    ? Math.round((conclue / (negociation + conclue)) * 100)
    : 0

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: 'var(--foreground, #0f172a)',
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Target size={13} />
            </div>
            {t('reporting.funnelTitle')}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-foreground, #64748b)', marginTop: 2 }}>
            {t('reporting.funnelSubtitle', { total })}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
            background: 'var(--secondary, rgba(0,0,0,0.04))',
            color: 'var(--muted-foreground, #64748b)',
            border: '1px solid var(--border, rgba(0,0,0,0.06))'
          }}
        >
          {t('reporting.funnelCount', { total })}
        </span>
      </div>

      {/* Stages list with elegant progress bars & transitions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stages.map((stage, i) => {
          const StageIcon = stage.icon
          const conversionRate = i === 0 ? pToN : nToC
          return (
            <div key={stage.label}>
              <div
                style={{
                  background: 'var(--card, #ffffff)',
                  border: '1px solid var(--border, rgba(0,0,0,0.07))',
                  borderRadius: 12,
                  padding: '12px 14px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: stage.bg,
                        color: stage.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <StageIcon size={14} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--foreground, #0f172a)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        {stage.label}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted-foreground, #64748b)' }}>
                        {stage.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: stage.color,
                        fontFamily: "'Syne', -apple-system, sans-serif"
                      }}
                    >
                      {stage.value}
                    </span>{' '}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--muted-foreground, #64748b)'
                      }}
                    >
                      ({stage.pct}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: 'var(--secondary, rgba(0,0,0,0.06))',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${stage.pct}%`,
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${stage.color}, ${stage.color}cc)`,
                      transition: 'width 0.8s ease'
                    }}
                  />
                </div>
              </div>

              {/* Transition connector between steps */}
              {i < stages.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    margin: '5px 0',
                    fontSize: 10.5,
                    color: 'var(--muted-foreground, #64748b)'
                  }}
                >
                  <div
                    style={{
                      height: 10,
                      width: 1,
                      background: 'var(--border, rgba(0,0,0,0.1))'
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 7px',
                      borderRadius: 10,
                      background: 'var(--secondary, rgba(0,0,0,0.04))',
                      color: 'var(--muted-foreground, #64748b)'
                    }}
                  >
                    {t('reporting.advancementRate', { rate: conversionRate })}
                  </span>
                  <div
                    style={{
                      height: 10,
                      width: 1,
                      background: 'var(--border, rgba(0,0,0,0.1))'
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer efficiency metric */}
      <div
        style={{
          marginTop: 16,
          padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11.5
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#047857', fontWeight: 600 }}>
          <CheckCircle2 size={13} /> {t('reporting.globalClosingRate')}
        </div>
        <div style={{ fontWeight: 800, color: '#047857', fontSize: 13 }}>
          {Math.round((conclue / total) * 100)}%
        </div>
      </div>
    </div>
  )
}

// ── Monthly Trend Bar Chart ──────────────────────────────────────────────────
function MonthlyTrendChart({
  data
}: {
  data: { month: string; conclue: number; total: number }[]
}) {
  const { t } = useTranslation()
  const maxVal = Math.max(...data.map((d) => d.total), 1)
  const chartH = 140
  const totalLeadsPeriod = data.reduce((acc, d) => acc + d.total, 0)
  const totalConcluePeriod = data.reduce((acc, d) => acc + d.conclue, 0)

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: 'var(--foreground, #0f172a)',
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Calendar size={13} />
            </div>
            {t('reporting.monthlyActivityTitle')}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-foreground, #64748b)', marginTop: 2 }}>
            {t('reporting.monthlyActivitySubtitle')}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
            background: 'var(--secondary, rgba(0,0,0,0.04))',
            color: 'var(--muted-foreground, #64748b)',
            border: '1px solid var(--border, rgba(0,0,0,0.06))'
          }}
        >
          {t('reporting.monthlyActivityBadge', { concluded: totalConcluePeriod, total: totalLeadsPeriod })}
        </span>
      </div>

      {/* Chart container with horizontal gridlines */}
      <div style={{ position: 'relative', marginTop: 10 }}>
        {/* Guidelines at 50% and 100% */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 0,
            right: 0,
            borderTop: '1px dashed var(--border, rgba(0,0,0,0.08))',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 24 + chartH / 2,
            left: 0,
            right: 0,
            borderTop: '1px dashed var(--border, rgba(0,0,0,0.05))',
            pointerEvents: 'none'
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 10,
            height: chartH + 50,
            paddingTop: 24
          }}
        >
          {data.map((d, idx) => {
            const isLast = idx === data.length - 1
            const totalH = Math.round((d.total / maxVal) * chartH)
            const conclueH = d.total > 0 ? Math.round((d.conclue / d.total) * totalH) : 0

            return (
              <div
                key={d.month}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  height: '100%',
                  justifyContent: 'flex-end',
                  cursor: 'default'
                }}
                title={`${d.month} : ${d.total} prospect${d.total > 1 ? 's' : ''}, ${d.conclue} conclu${d.conclue > 1 ? 's' : ''}`}
              >
                {/* Value tooltip pill above active bar */}
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: d.total > 0 ? 'var(--foreground, #0f172a)' : 'transparent',
                    marginBottom: 2
                  }}
                >
                  {d.total > 0 ? d.total : '·'}
                </div>

                {/* Vertical Bar Stack */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: 38,
                    height: Math.max(totalH, 4),
                    borderRadius: '8px 8px 0 0',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Concluded deals fill inside */}
                  <div
                    style={{
                      width: '100%',
                      height: Math.max(conclueH, d.conclue > 0 ? 4 : 0),
                      background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.6s ease'
                    }}
                  />
                </div>

                {/* Month label */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: isLast ? 800 : 500,
                    color: isLast ? 'var(--primary, #3b82f6)' : 'var(--muted-foreground, #64748b)',
                    textAlign: 'center',
                    marginTop: 4
                  }}
                >
                  {d.month}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid var(--border, rgba(0,0,0,0.06))'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--muted-foreground, #64748b)'
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: 'rgba(59, 130, 246, 0.25)',
              border: '1px solid rgba(59, 130, 246, 0.5)'
            }}
          />
          {t('reporting.totalOpportunities')}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--muted-foreground, #64748b)'
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
            }}
          />
          {t('reporting.closedDeals')}
        </div>
      </div>
    </div>
  )
}

// ── Format Currency Helper ────────────────────────────────────────────────────
function formatFcfa(amount: number) {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M F`
  }
  return `${new Intl.NumberFormat('fr-FR').format(amount)} F`
}

// ── Member Performance Detail Modal ──────────────────────────────────────────
function MemberPerformanceModal({ member, onClose }: { member: MemberStat; onClose: () => void }) {
  const { t } = useTranslation()
  const [dealFilter, setDealFilter] = useState<'all' | 'conclue' | 'negociation' | 'prospection'>(
    'all'
  )

  const filteredDeals = member.deals.filter((d) => {
    if (dealFilter === 'all') return true
    if (dealFilter === 'prospection') return ['prospection', 'prospect'].includes(d.status)
    if (dealFilter === 'negociation') return ['negociation', 'negotiation'].includes(d.status)
    if (dealFilter === 'conclue') return ['conclue', 'conclusion'].includes(d.status)
    return true
  })

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)'
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            background: 'var(--card, #131c2e)',
            border: `1px solid var(--border, rgba(255,255,255,0.1))`,
            borderRadius: 20,
            width: '100%',
            maxWidth: 680,
            padding: 28,
            pointerEvents: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          {/* Header */}
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 800,
                  fontFamily: "'Syne', sans-serif"
                }}
              >
                {member.name[0]?.toUpperCase() || 'C'}
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 800,
                    color: 'var(--foreground, #f1f5f9)'
                  }}
                >
                  {member.name}
                </h2>
                <div
                  style={{ fontSize: 12, color: 'var(--muted-foreground, #94a3b8)', marginTop: 2 }}
                >
                  {t('reporting.modalSalespersonRole', { count: member.total })}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'var(--secondary, #1e2a3b)',
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                borderRadius: 10,
                color: 'var(--muted-foreground, #94a3b8)',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <X size={14} />
              {t('reporting.modalClose')}
            </button>
          </div>

          {/* Quick Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
              background: 'var(--secondary, #1e2a3b)',
              padding: 16,
              borderRadius: 14,
              border: '1px solid var(--border, rgba(255,255,255,0.1))'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--muted-foreground, #94a3b8)',
                  textTransform: 'uppercase'
                }}
              >
                {t('reporting.colClosedRevenue')}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#34d399', marginTop: 4 }}>
                {formatFcfa(member.revenue || 0)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--muted-foreground, #94a3b8)',
                  textTransform: 'uppercase'
                }}
              >
                {t('reporting.kpiPipelineValue')}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa', marginTop: 4 }}>
                {formatFcfa(member.pipelineValue || 0)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--muted-foreground, #94a3b8)',
                  textTransform: 'uppercase'
                }}
              >
                {t('reporting.kpiConversionRate')}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24', marginTop: 4 }}>
                {member.conversionRate}%
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--muted-foreground, #94a3b8)',
                  textTransform: 'uppercase'
                }}
              >
                {t('reporting.kpiOverdue')}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: member.overdueFollowUps > 0 ? '#f87171' : '#94a3b8',
                  marginTop: 4
                }}
              >
                {member.overdueFollowUps}
              </div>
            </div>
          </div>

          {/* Status Breakdown Bar */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                color: 'var(--muted-foreground, #94a3b8)',
                marginBottom: 6
              }}
            >
              <span>{t('reporting.modalPortfolioBreakdown')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Target size={12} color="#60a5fa" />
                  <strong>{member.prospection}</strong> {t('reporting.stageProspection').toLowerCase()}
                </span>
                <span>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Handshake size={12} color="#fb923c" />
                  <strong>{member.negociation}</strong> {t('reporting.stageNegociation').toLowerCase()}
                </span>
                <span>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Trophy size={12} color="#0284c7" />
                  <strong>{member.conclue}</strong> {t('reporting.stageConclue').toLowerCase()}
                </span>
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 6,
                display: 'flex',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${member.total > 0 ? (member.prospection / member.total) * 100 : 0}%`,
                  background: '#60a5fa'
                }}
              />
              <div
                style={{
                  width: `${member.total > 0 ? (member.negociation / member.total) * 100 : 0}%`,
                  background: '#fb923c'
                }}
              />
              <div
                style={{
                  width: `${member.total > 0 ? (member.conclue / member.total) * 100 : 0}%`,
                  background: '#0284c7'
                }}
              />
            </div>
          </div>

          {/* Filter Pills for deals */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
              paddingBottom: 10
            }}
          >
            {[
              { id: 'all', label: t('reporting.modalFilterAll', { count: member.deals.length }) },
              { id: 'conclue', label: t('reporting.modalFilterConclue', { count: member.conclue }) },
              { id: 'negociation', label: t('reporting.modalFilterNegociation', { count: member.negociation }) },
              { id: 'prospection', label: t('reporting.modalFilterProspection', { count: member.prospection }) }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDealFilter(tab.id as any)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: dealFilter === tab.id ? 'rgba(37,99,235,0.2)' : 'transparent',
                  color: dealFilter === tab.id ? '#60a5fa' : 'var(--muted-foreground, #94a3b8)',
                  fontSize: 12,
                  fontWeight: dealFilter === tab.id ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Deals list */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              paddingRight: 4
            }}
          >
            {filteredDeals.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--muted-foreground, #94a3b8)',
                  fontSize: 13,
                  padding: '30px 0'
                }}
              >
                {t('reporting.modalNoDeals')}
              </div>
            ) : (
              filteredDeals.map((deal) => {
                const isWon = ['conclue', 'conclusion'].includes(deal.status)
                const isNego = ['negociation', 'negotiation'].includes(deal.status)
                return (
                  <div
                    key={deal.id}
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 10,
                      border: '1px solid var(--border, rgba(255,255,255,0.08))',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--foreground, #f1f5f9)'
                        }}
                      >
                        {deal.companyName}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--muted-foreground, #94a3b8)',
                          marginTop: 3,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 10,
                          alignItems: 'center'
                        }}
                      >
                        {deal.companyCity && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} style={{ opacity: 0.7 }} />
                            {deal.companyCity}
                          </span>
                        )}
                        {deal.companySector && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Building2 size={11} style={{ opacity: 0.7 }} />
                            {deal.companySector}
                          </span>
                        )}
                        {deal.nextFollowUp && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={11} style={{ opacity: 0.7 }} />
                            Suivi : {deal.nextFollowUp}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {deal.amount > 0 ? (
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: isWon ? '#34d399' : '#60a5fa'
                          }}
                        >
                          {formatFcfa(deal.amount)}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--muted-foreground, #64748b)',
                            fontStyle: 'italic'
                          }}
                        >
                          Montant non spécifié
                        </div>
                      )}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: isWon
                            ? 'rgba(52,211,153,0.15)'
                            : isNego
                              ? 'rgba(251,146,60,0.15)'
                              : 'rgba(96,165,250,0.15)',
                          color: isWon ? '#34d399' : isNego ? '#fb923c' : '#60a5fa',
                          marginTop: 4,
                          display: 'inline-block'
                        }}
                      >
                        {isWon ? 'Conclue' : isNego ? 'Négociation' : 'Prospection'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Leaderboard & Individual Performance Section ──────────────────────────────
function Leaderboard({ members }: { members: MemberStat[] }) {
  const { t } = useTranslation()
  const [selectedMember, setSelectedMember] = useState<MemberStat | null>(null)

  return (
    <div>
      {selectedMember && (
        <MemberPerformanceModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 800,
              color: 'var(--foreground, #f1f5f9)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Trophy size={16} color="#fbbf24" />
            {t('reporting.leaderboardTitle')}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>
            {t('reporting.leaderboardSubtitle')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.map((member, i) => {
          const maxConclue = members[0]?.conclue || 1
          const barWidth = Math.max(5, Math.round((member.conclue / maxConclue) * 100))
          return (
            <div
              key={member.uid}
              onClick={() => setSelectedMember(member)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 18px',
                background: i === 0 ? 'rgba(74,222,128,0.06)' : 'var(--secondary, #1e2a3b)',
                borderRadius: 12,
                border: `1px solid ${i === 0 ? 'rgba(74,222,128,0.25)' : 'var(--border, rgba(255,255,255,0.1))'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.6)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  i === 0 ? 'rgba(74,222,128,0.25)' : 'var(--border, rgba(255,255,255,0.1))'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* Rang / Médaille */}
              <div
                style={{
                  width: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {i === 0 ? (
                  <Trophy size={18} color="#fbbf24" />
                ) : i === 1 ? (
                  <Medal size={18} color="#94a3b8" />
                ) : i === 2 ? (
                  <Medal size={18} color="#d97706" />
                ) : (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--muted-foreground, #64748b)'
                    }}
                  >
                    {i + 1}.
                  </span>
                )}
              </div>

              {/* Nom & jauge */}
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground, #f1f5f9)' }}
                  >
                    {member.name}
                  </span>
                  {member.overdueFollowUps > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#f87171',
                        background: 'rgba(239,68,68,0.12)',
                        padding: '1px 6px',
                        borderRadius: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <AlertTriangle size={10} />
                      {t('reporting.overdueCount', { count: member.overdueFollowUps })}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    height: 5,
                    background: 'var(--card, #131c2e)',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: '100%',
                      background: '#0284c7',
                      borderRadius: 4,
                      transition: 'width 0.8s ease'
                    }}
                  />
                </div>
              </div>

              {/* Statuts détails */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  textAlign: 'center',
                  fontSize: 11,
                  color: 'var(--muted-foreground, #94a3b8)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#60a5fa' }}>{member.prospection}</div>
                  <div>{t('reporting.colProsp')}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fb923c' }}>{member.negociation}</div>
                  <div>{t('reporting.colNego')}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0284c7' }}>{member.conclue}</div>
                  <div>{t('reporting.colConclue')}</div>
                </div>
              </div>

              {/* CA Gagné */}
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#34d399' }}>
                  {formatFcfa(member.revenue || 0)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted-foreground, #94a3b8)' }}>
                  {t('reporting.colClosedRevenue')}
                </div>
              </div>

              {/* Taux de conversion */}
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 55 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color:
                      member.conversionRate >= 50
                        ? '#0284c7'
                        : member.conversionRate >= 25
                          ? '#fbbf24'
                          : 'var(--muted-foreground, #94a3b8)'
                  }}
                >
                  {member.conversionRate}%
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted-foreground, #94a3b8)' }}>
                  {t('reporting.colConvRate')}
                </div>
              </div>

              {/* Bouton inspecter */}
              <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600 }}>{t('reporting.detailsBtn')}</div>
            </div>
          )
        })}

        {members.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--muted-foreground, #94a3b8)',
              fontSize: 13,
              padding: '24px 0'
            }}
          >
            Aucune donnée disponible. Les statistiques apparaîtront ici dès que votre équipe
            commencera à enregistrer des prospects.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Support Activity Section ──────────────────────────────────────────────────
function SupportActivitySection({
  stats,
  initialAgentUid
}: {
  stats: NonNullable<ReportingData['supportStats']>
  initialAgentUid?: string
}) {
  const { t } = useTranslation()
  const agents = stats.agentsBreakdown || []
  const [selectedAgentUid, setSelectedAgentUid] = useState<string>(initialAgentUid || 'all')

  const selectedAgent = agents.find((a) => a.uid === selectedAgentUid)

  // Filter logs according to selected agent
  const displayedCalls =
    selectedAgentUid === 'all'
      ? stats.recentCalls
      : stats.recentCalls.filter(
          (c) =>
            c.agentUid === selectedAgentUid || (selectedAgent && c.agentName === selectedAgent.name)
        )

  const displayedTickets =
    selectedAgentUid === 'all'
      ? stats.recentTickets
      : stats.recentTickets.filter(
          (t) =>
            t.agentUid === selectedAgentUid || (selectedAgent && t.agentName === selectedAgent.name)
        )

  // Dynamically compute KPIs
  const callsCount = selectedAgent ? selectedAgent.callsCount : stats.callsCount
  const ticketsCount = selectedAgent ? selectedAgent.ticketsCount : stats.ticketsCount
  const resolvedTicketsCount = selectedAgent
    ? selectedAgent.resolvedTicketsCount
    : stats.resolvedTicketsCount
  const openTicketsCount = selectedAgent ? selectedAgent.openTicketsCount : stats.openTicketsCount
  const resolutionRate =
    ticketsCount > 0 ? Math.round((resolvedTicketsCount / ticketsCount) * 100) : 0

  const CALL_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    connected: { label: t('reporting.statusConnected'), color: '#3b82f6' },
    no_answer: { label: t('reporting.statusNoAnswer'), color: '#f59e0b' },
    busy: { label: t('reporting.statusBusy'), color: '#f97316' },
    voicemail: { label: t('reporting.statusVoicemail'), color: '#a78bfa' },
    failed: { label: t('reporting.statusFailed'), color: '#f87171' }
  }

  const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    low: { label: t('reporting.priorityLow'), color: '#60a5fa' },
    medium: { label: t('reporting.priorityMedium'), color: '#f59e0b' },
    high: { label: t('reporting.priorityHigh'), color: '#f97316' },
    urgent: { label: t('reporting.priorityUrgent'), color: '#f87171' }
  }

  const TICKET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    open: { label: t('reporting.ticketOpen'), color: '#f87171' },
    in_progress: { label: t('reporting.ticketInProgress'), color: '#f59e0b' },
    resolved: { label: t('reporting.ticketResolved'), color: '#0284c7' },
    closed: { label: t('reporting.ticketClosed'), color: '#94a3b8' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Agent Selector Bar */}
      {agents.length > 0 && (
        <div
          style={{
            background: 'var(--card, #131c2e)',
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            borderRadius: 16,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--muted-foreground, #94a3b8)',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Users size={14} />
                {t('reporting.supportFilterTitle')}
              </span>
              {selectedAgentUid !== 'all' && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'none',
                    background: 'rgba(59,130,246,0.15)',
                    color: '#60a5fa',
                    padding: '2px 8px',
                    borderRadius: 12,
                    border: '1px solid rgba(59,130,246,0.3)'
                  }}
                >
                  {t('reporting.supportActiveFilter', { name: selectedAgent?.name })}
                </span>
              )}
            </div>

            {selectedAgentUid !== 'all' && (
              <button
                onClick={() => setSelectedAgentUid('all')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {t('reporting.supportAllAgents')}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedAgentUid('all')}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: `1px solid ${selectedAgentUid === 'all' ? '#3b82f6' : 'var(--border, rgba(255,255,255,0.1))'}`,
                background:
                  selectedAgentUid === 'all' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
                color: selectedAgentUid === 'all' ? '#60a5fa' : 'var(--foreground, #f1f5f9)',
                fontWeight: selectedAgentUid === 'all' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 150ms',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Users size={13} />
              {t('reporting.supportAllAgents')} ({stats.callsCount} · {stats.ticketsCount})
            </button>

            {agents.map((ag) => {
              const isSelected = selectedAgentUid === ag.uid
              return (
                <button
                  key={ag.uid}
                  onClick={() => setSelectedAgentUid(ag.uid)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: `1px solid ${isSelected ? '#3b82f6' : 'var(--border, rgba(255,255,255,0.1))'}`,
                    background: isSelected ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
                    color: isSelected ? '#60a5fa' : 'var(--foreground, #f1f5f9)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 150ms'
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: isSelected ? '#3b82f6' : 'rgba(235,133,18,0.2)',
                      color: isSelected ? '#fff' : '#eb8512',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700
                    }}
                  >
                    {ag.name[0]?.toUpperCase() || 'A'}
                  </span>
                  <span>{ag.name}</span>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>
                    ({ag.callsCount} · {ag.ticketsCount})
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Support KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16
        }}
      >
        <KpiCard
          label={t('reporting.supportCallsCount')}
          value={callsCount}
          sub={t('reporting.supportCallsCountSub')}
          color="#3b82f6"
          icon={Phone}
        />
        <KpiCard
          label={t('reporting.supportTicketsCount')}
          value={ticketsCount}
          sub={t('reporting.supportTicketsCountSub')}
          color="#f59e0b"
          icon={Ticket}
        />
        <KpiCard
          label={t('reporting.ticketOpen')}
          value={openTicketsCount}
          sub="En attente de résolution"
          color="#ef4444"
          icon={Clock}
        />
        <KpiCard
          label={t('reporting.supportResolutionRate')}
          value={`${resolutionRate}%`}
          sub={t('reporting.supportResolutionRateSub')}
          color={resolutionRate >= 70 ? '#10b981' : '#f59e0b'}
          icon={CheckCircle2}
        />
      </div>

      {/* Agents Performance Leaderboard (Only when viewing 'all' or multiple agents exist) */}
      {agents.length > 0 && selectedAgentUid === 'all' && (
        <div
          style={{
            background: 'var(--card, #ffffff)',
            border: '1px solid var(--border, rgba(0,0,0,0.08))',
            borderRadius: 16,
            padding: 22,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--foreground, #f1f5f9)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Trophy size={16} color="#fbbf24" />
              Performances individuelles des agents support
            </h3>
            <p
              style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}
            >
              Volume d'appels, réclamations traitées et efficacité de clôture par agent.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 14
            }}
          >
            {agents.map((ag, idx) => (
              <div
                key={ag.uid}
                onClick={() => setSelectedAgentUid(ag.uid)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                  borderRadius: 12,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'all 200ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border, rgba(255,255,255,0.1))'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: 'rgba(235,133,18,0.15)',
                        color: '#eb8512',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 14
                      }}
                    >
                      {ag.name[0]?.toUpperCase() || 'A'}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--foreground, #f1f5f9)'
                        }}
                      >
                        {ag.name}
                      </div>
                      {ag.email && (
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
                          {ag.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>Filtrer →</span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.15)',
                    padding: '10px 8px',
                    borderRadius: 8
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa' }}>
                      {ag.callsCount}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted-foreground, #94a3b8)' }}>
                      Appels
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>
                      {ag.ticketsCount}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted-foreground, #94a3b8)' }}>
                      Tickets
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: ag.resolutionRate >= 70 ? '#0284c7' : '#f59e0b'
                      }}
                    >
                      {ag.resolutionRate}%
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted-foreground, #94a3b8)' }}>
                      Résolus
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout for recent logs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20
        }}
      >
        {/* Calls Log */}
        <div
          style={{
            background: 'var(--card, #131c2e)',
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--foreground, #f1f5f9)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Phone size={16} /> Journal des Appels Clients
            </h3>
            <p
              style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}
            >
              {selectedAgent
                ? `Historique des appels passés par ${selectedAgent.name}.`
                : 'Les appels de support récents passés par vos agents.'}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: 400,
              overflowY: 'auto',
              paddingRight: 4
            }}
          >
            {displayedCalls.length === 0 ? (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--muted-foreground, #94a3b8)',
                  textAlign: 'center',
                  padding: '30px 0'
                }}
              >
                {selectedAgent
                  ? `Aucun appel enregistré pour ${selectedAgent.name}.`
                  : 'Aucun appel enregistré pour le moment.'}
              </p>
            ) : (
              displayedCalls.map((call) => (
                <div
                  key={call.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                    borderRadius: 10,
                    padding: '12px 14px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6
                    }}
                  >
                    <strong style={{ fontSize: 13, color: 'var(--foreground, #f1f5f9)' }}>
                      {call.clientName || 'Client inconnu'}
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
                      {new Date(call.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '1px 8px',
                        borderRadius: 4,
                        background: `${CALL_STATUS_LABELS[call.status]?.color}22`,
                        color: CALL_STATUS_LABELS[call.status]?.color
                      }}
                    >
                      {CALL_STATUS_LABELS[call.status]?.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
                      par {call.agentName}
                    </span>
                  </div>
                  {call.notes && (
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--muted-foreground, #94a3b8)',
                        margin: 0,
                        lineHeight: 1.4,
                        background: 'rgba(0,0,0,0.15)',
                        padding: 8,
                        borderRadius: 6
                      }}
                    >
                      {call.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tickets Log */}
        <div
          style={{
            background: 'var(--card, #131c2e)',
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--foreground, #f1f5f9)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Ticket size={16} /> Tickets SAV / Réclamations
            </h3>
            <p
              style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}
            >
              {selectedAgent
                ? `Tickets pris en charge par ${selectedAgent.name}.`
                : 'Les tickets de support récents de vos clients.'}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: 400,
              overflowY: 'auto',
              paddingRight: 4
            }}
          >
            {displayedTickets.length === 0 ? (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--muted-foreground, #94a3b8)',
                  textAlign: 'center',
                  padding: '30px 0'
                }}
              >
                {selectedAgent
                  ? `Aucun ticket SAV enregistré pour ${selectedAgent.name}.`
                  : 'Aucun ticket SAV ouvert pour le moment.'}
              </p>
            ) : (
              displayedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                    borderRadius: 10,
                    padding: '12px 14px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6
                    }}
                  >
                    <strong style={{ fontSize: 13, color: 'var(--foreground, #f1f5f9)' }}>
                      {ticket.clientName}
                    </strong>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: `${PRIORITY_LABELS[ticket.priority]?.color}22`,
                        color: PRIORITY_LABELS[ticket.priority]?.color
                      }}
                    >
                      {PRIORITY_LABELS[ticket.priority]?.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--foreground, #f1f5f9)',
                      marginBottom: 4
                    }}
                  >
                    {ticket.subject}
                  </div>
                  {ticket.description && (
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--muted-foreground, #94a3b8)',
                        margin: '0 0 8px',
                        lineHeight: 1.4
                      }}
                    >
                      {ticket.description}
                    </p>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 11,
                      color: 'var(--muted-foreground, #64748b)'
                    }}
                  >
                    <span>Par {ticket.agentName}</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontWeight: 700,
                        background: `${TICKET_STATUS_LABELS[ticket.status]?.color}22`,
                        color: TICKET_STATUS_LABELS[ticket.status]?.color
                      }}
                    >
                      {TICKET_STATUS_LABELS[ticket.status]?.label}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard Component ──────────────────────────────────────────────────
export function ReportingDashboard({ data }: { data: ReportingData }) {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialAgentUid = searchParams.get('agentUid') || undefined
  const [section, setSection] = useState<'sales' | 'support'>(
    tabParam === 'support' ? 'support' : 'sales'
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Tab Selector */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
          gap: 12
        }}
      >
        <button
          onClick={() => setSection('sales')}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: section === 'sales' ? `2px solid ${'#3b82f6'}` : '2px solid transparent',
            color: section === 'sales' ? '#3b82f6' : 'var(--muted-foreground, #94a3b8)',
            fontWeight: section === 'sales' ? 700 : 500,
            cursor: 'pointer',
            fontSize: 14,
            transition: 'all 150ms',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <BarChart3 size={15} /> {t('reporting.tabSales')}
        </button>
        {data.supportStats && (
          <button
            onClick={() => setSection('support')}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom:
                section === 'support' ? `2px solid ${'#3b82f6'}` : '2px solid transparent',
              color: section === 'support' ? '#3b82f6' : 'var(--muted-foreground, #94a3b8)',
              fontWeight: section === 'support' ? 700 : 500,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 150ms',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Headphones size={15} /> {t('reporting.tabSupport')}
          </button>
        )}
      </div>

      {section === 'sales' ? (
        <>
          {/* KPI Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16
            }}
          >
            <KpiCard
              label={t('reporting.kpiRevenue')}
              value={formatFcfa(data.totalRevenue || 0)}
              sub={t('reporting.kpiRevenueSub')}
              color="#10b981"
              icon={Banknote}
            />
            <KpiCard
              label={t('reporting.kpiPipelineValue')}
              value={formatFcfa(data.pipelineValue || 0)}
              sub={t('reporting.kpiPipelineValueSub')}
              color="#3b82f6"
              icon={Briefcase}
            />
            <KpiCard
              label={t('reporting.kpiClosed')}
              value={data.totalConclue}
              sub={t('reporting.kpiClosedSub', { count: data.totalItems })}
              color="#0ea5e9"
              icon={CheckCircle2}
            />
            <KpiCard
              label={t('reporting.kpiConversionRate')}
              value={`${data.overallConversionRate}%`}
              sub={t('reporting.kpiConversionRateSub')}
              color={data.overallConversionRate >= 30 ? '#10b981' : '#f59e0b'}
              icon={TrendingUp}
            />
            <KpiCard
              label={t('reporting.kpiTopCommercial')}
              value={data.topPerformer ?? '—'}
              sub={t('reporting.kpiTopCommercialSub')}
              color="#f59e0b"
              icon={Trophy}
              isPerson
            />
            <KpiCard
              label={t('reporting.kpiOverdue')}
              value={data.totalOverdueFollowUps ?? 0}
              sub={(data.totalOverdueFollowUps ?? 0) > 0 ? t('reporting.kpiOverdueSub') : t('reporting.kpiNoOverdue')}
              color={(data.totalOverdueFollowUps ?? 0) > 0 ? '#ef4444' : '#10b981'}
              icon={AlertTriangle}
            />
          </div>

          {/* Charts Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 20
            }}
          >
            <div
              style={{
                background: 'var(--card, #ffffff)',
                border: '1px solid var(--border, rgba(0,0,0,0.08))',
                borderRadius: 16,
                padding: '22px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)'
              }}
            >
              <PipelineFunnel
                prospection={data.totalProspection}
                negociation={data.totalNegociation}
                conclue={data.totalConclue}
              />
            </div>
            <div
              style={{
                background: 'var(--card, #ffffff)',
                border: '1px solid var(--border, rgba(0,0,0,0.08))',
                borderRadius: 16,
                padding: '22px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)'
              }}
            >
              <MonthlyTrendChart data={data.monthlyTrend} />
            </div>
          </div>

          {/* Leaderboard */}
          <div
            style={{
              background: 'var(--card, #ffffff)',
              border: '1px solid var(--border, rgba(0,0,0,0.08))',
              borderRadius: 16,
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)'
            }}
          >
            <Leaderboard members={data.memberStats} />
          </div>
        </>
      ) : (
        data.supportStats && (
          <SupportActivitySection stats={data.supportStats} initialAgentUid={initialAgentUid} />
        )
      )}
    </div>
  )
}
