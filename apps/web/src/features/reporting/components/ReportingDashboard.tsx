'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ReportingData, MemberStat, SupportAgentStat } from '../hooks/useReportingData'
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
  Medal
} from 'lucide-react'

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  color,
  icon: Icon
}: {
  label: string
  value: string | number
  sub?: string
  color: string
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
}) {
  return (
    <div
      style={{
        background: 'var(--card, #131c2e)',
        border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
        borderRadius: 16,
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          opacity: 0.07,
          pointerEvents: 'none'
        }}
      >
        <Icon size={64} color={color} strokeWidth={1.5} />
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--muted-foreground, #94a3b8)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        <Icon size={13} color={color} />
        {label}
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color,
          fontFamily: "'Syne', sans-serif",
          lineHeight: 1
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--muted-foreground, #94a3b8)', marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Pipeline Funnel (SVG pur) ─────────────────────────────────────────────────
function PipelineFunnel({
  prospection,
  negociation,
  conclue
}: {
  prospection: number
  negociation: number
  conclue: number
}) {
  const total = prospection + negociation + conclue || 1
  const stages = [
    {
      label: 'Prospection',
      value: prospection,
      color: '#60a5fa',
      pct: Math.round((prospection / total) * 100)
    },
    {
      label: 'Négociation',
      value: negociation,
      color: '#fbbf24',
      pct: Math.round((negociation / total) * 100)
    },
    { label: 'Conclue', value: conclue, color: '#0284c7', pct: Math.round((conclue / total) * 100) }
  ]

  return (
    <div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--muted-foreground, #94a3b8)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          marginBottom: 16
        }}
      >
        Entonnoir de conversion
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stages.map((stage, i) => {
          const width = Math.max(30, 100 - i * 18)
          return (
            <div key={stage.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 90,
                  fontSize: 12,
                  color: 'var(--muted-foreground, #94a3b8)',
                  textAlign: 'right',
                  flexShrink: 0
                }}
              >
                {stage.label}
              </div>
              <div style={{ flex: 1, position: 'relative', height: 36 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: `${(100 - width) / 2}%`,
                    width: `${width}%`,
                    height: '100%',
                    background: `${stage.color}22`,
                    border: `1px solid ${stage.color}55`,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.4s ease'
                  }}
                >
                  <div
                    style={{
                      width: `${stage.pct}%`,
                      height: '70%',
                      background: stage.color,
                      borderRadius: 5,
                      transition: 'width 0.8s ease',
                      minWidth: stage.value > 0 ? 4 : 0
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  width: 60,
                  fontSize: 13,
                  fontWeight: 700,
                  color: stage.color,
                  flexShrink: 0
                }}
              >
                {stage.value}{' '}
                <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
                  ({stage.pct}%)
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Monthly Trend Bar Chart (SVG pur) ─────────────────────────────────────────
function MonthlyTrendChart({
  data
}: {
  data: { month: string; conclue: number; total: number }[]
}) {
  const maxVal = Math.max(...data.map((d) => d.total), 1)
  const chartH = 120

  return (
    <div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--muted-foreground, #94a3b8)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          marginBottom: 16
        }}
      >
        Activité mensuelle (6 derniers mois)
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: chartH + 32 }}>
        {data.map((d) => {
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
                gap: 6
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--muted-foreground, #64748b)' }}>
                {d.total > 0 ? d.total : ''}
              </div>
              <div
                style={{
                  width: '100%',
                  height: Math.max(totalH, 4),
                  borderRadius: '6px 6px 0 0',
                  background: 'rgba(96,165,250,0.15)',
                  border: '1px solid rgba(96,165,250,0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: Math.max(conclueH, d.conclue > 0 ? 4 : 0),
                    background: '#0284c7',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.6s ease'
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--muted-foreground, #94a3b8)',
                  textAlign: 'center'
                }}
              >
                {d.month}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--muted-foreground, #94a3b8)'
          }}
        >
          <div
            style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(96,165,250,0.4)' }}
          />{' '}
          Total prospects
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--muted-foreground, #94a3b8)'
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#0284c7' }} /> Affaires
          conclues
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
                  {member.accessId ? `Identifiant : ${member.accessId}` : 'Commercial'} ·{' '}
                  {member.total} opportunités
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
              Fermer
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
                CA Clôturé
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
                Pipeline en cours
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
                Conversion
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
                Relances retard
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
              <span>Répartition du portefeuille :</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Target size={12} color="#60a5fa" />
                  <strong>{member.prospection}</strong> prospection
                </span>
                <span>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Handshake size={12} color="#fb923c" />
                  <strong>{member.negociation}</strong> négociation
                </span>
                <span>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Trophy size={12} color="#0284c7" />
                  <strong>{member.conclue}</strong> conclues
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
              { id: 'all', label: `Toutes (${member.deals.length})` },
              { id: 'conclue', label: `Conclues (${member.conclue})` },
              { id: 'negociation', label: `En Négociation (${member.negociation})` },
              { id: 'prospection', label: `En Prospection (${member.prospection})` }
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
                Aucune opportunité dans cette catégorie.
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
            Performances individuelles détaillées & Leaderboard
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>
            Cliquez sur un commercial pour analyser son portefeuille et l&apos;ensemble de ses
            affaires en détail.
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
                  {member.accessId && (
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
                      ({member.accessId})
                    </span>
                  )}
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
                      {member.overdueFollowUps} relance{member.overdueFollowUps > 1 ? 's' : ''} en
                      retard
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
                  <div>Prosp.</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fb923c' }}>{member.negociation}</div>
                  <div>Négo.</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0284c7' }}>{member.conclue}</div>
                  <div>Conclues</div>
                </div>
              </div>

              {/* CA Gagné */}
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#34d399' }}>
                  {formatFcfa(member.revenue || 0)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted-foreground, #94a3b8)' }}>
                  CA Clôturé
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
                  taux conv.
                </div>
              </div>

              {/* Bouton inspecter */}
              <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600 }}>Détails →</div>
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
    connected: { label: 'Décroché', color: '#3b82f6' },
    no_answer: { label: 'Non joint', color: '#f59e0b' },
    busy: { label: 'Occupé', color: '#f97316' },
    voicemail: { label: 'Répondeur', color: '#a78bfa' },
    failed: { label: 'Échec', color: '#f87171' }
  }

  const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    low: { label: 'Basse', color: '#60a5fa' },
    medium: { label: 'Moyenne', color: '#f59e0b' },
    high: { label: 'Haute', color: '#f97316' },
    urgent: { label: 'Urgente', color: '#f87171' }
  }

  const TICKET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    open: { label: 'Ouvert', color: '#f87171' },
    in_progress: { label: 'En cours', color: '#f59e0b' },
    resolved: { label: 'Résolu', color: '#0284c7' },
    closed: { label: 'Fermé', color: '#94a3b8' }
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
                Filtrer l'activité par agent support
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
                  Filtre actif : {selectedAgent?.name}
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
                Afficher toute l'équipe
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
              Tous ({stats.callsCount} appels · {stats.ticketsCount} tickets)
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
                    ({ag.callsCount} appels · {ag.ticketsCount} tickets)
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16
        }}
      >
        <KpiCard
          label="Appels support"
          value={callsCount}
          sub={selectedAgent ? `Passés par ${selectedAgent.name}` : 'Passés par vos agents'}
          color="#60a5fa"
          icon={Phone}
        />
        <KpiCard
          label="Total tickets SAV"
          value={ticketsCount}
          sub={selectedAgent ? `Traités par ${selectedAgent.name}` : 'Créés pour vos clients'}
          color="#f59e0b"
          icon={Ticket}
        />
        <KpiCard
          label="Tickets ouverts"
          value={openTicketsCount}
          sub="En attente de résolution"
          color="#f87171"
          icon={Clock}
        />
        <KpiCard
          label="Taux de résolution"
          value={`${resolutionRate}%`}
          sub="Tickets résolus ou fermés"
          color={resolutionRate >= 70 ? '#0284c7' : '#f59e0b'}
          icon={CheckCircle2}
        />
      </div>

      {/* Agents Performance Leaderboard (Only when viewing 'all' or multiple agents exist) */}
      {agents.length > 0 && selectedAgentUid === 'all' && (
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
          <BarChart3 size={15} /> Ventes & Conversion
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
            <Headphones size={15} /> Activité Support SAV
          </button>
        )}
      </div>

      {section === 'sales' ? (
        <>
          {/* KPI Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 14
            }}
          >
            <KpiCard
              label="CA Total Encaissé"
              value={formatFcfa(data.totalRevenue || 0)}
              sub="Deals clôturés et validés"
              color="#34d399"
              icon={Banknote}
            />
            <KpiCard
              label="Valeur du Pipeline"
              value={formatFcfa(data.pipelineValue || 0)}
              sub="En prospection & négo"
              color="#60a5fa"
              icon={Briefcase}
            />
            <KpiCard
              label="Affaires conclues"
              value={data.totalConclue}
              sub={`Sur ${data.totalItems} prospects`}
              color="#0284c7"
              icon={CheckCircle2}
            />
            <KpiCard
              label="Taux de conversion"
              value={`${data.overallConversionRate}%`}
              sub="Prospection → Clôture"
              color={data.overallConversionRate >= 30 ? '#0284c7' : '#fbbf24'}
              icon={TrendingUp}
            />
            <KpiCard
              label="Top Commercial"
              value={data.topPerformer ?? '—'}
              sub="Plus grand nombre de ventes"
              color="#fbbf24"
              icon={Trophy}
            />
            <KpiCard
              label="Relances en retard"
              value={data.totalOverdueFollowUps ?? 0}
              sub="Dates de suivi dépassées"
              color={(data.totalOverdueFollowUps ?? 0) > 0 ? '#f87171' : '#94a3b8'}
              icon={AlertTriangle}
            />
          </div>

          {/* Charts Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 20
            }}
          >
            <div
              style={{
                background: 'var(--card, #131c2e)',
                border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                borderRadius: 16,
                padding: 24
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
                background: 'var(--card, #131c2e)',
                border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                borderRadius: 16,
                padding: 24
              }}
            >
              <MonthlyTrendChart data={data.monthlyTrend} />
            </div>
          </div>

          {/* Leaderboard */}
          <div
            style={{
              background: 'var(--card, #131c2e)',
              border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
              borderRadius: 16,
              padding: 24
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
