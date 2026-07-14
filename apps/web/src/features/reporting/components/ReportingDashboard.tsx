'use client'

import { useState } from 'react'
import { colors } from '@/styles/tokens'
import type { ReportingData, MemberStat } from '../hooks/useReportingData'


// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  color,
  icon
}: {
  label: string
  value: string | number
  sub?: string
  color: string
  icon: string
}) {
  return (
    <div
      style={{
        background: colors.bg2,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -10,
          right: -10,
          fontSize: 60,
          opacity: 0.06,
          lineHeight: 1,
          userSelect: 'none'
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMid, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: colors.textMid, marginTop: 6 }}>{sub}</div>
      )}
    </div>
  )
}

// ── Pipeline Funnel (SVG pur) ─────────────────────────────────────────────────
function PipelineFunnel({ prospection, negociation, conclue }: { prospection: number; negociation: number; conclue: number }) {
  const total = prospection + negociation + conclue || 1
  const stages = [
    { label: 'Prospection', value: prospection, color: '#60a5fa', pct: Math.round((prospection / total) * 100) },
    { label: 'Négociation', value: negociation, color: '#fbbf24', pct: Math.round((negociation / total) * 100) },
    { label: 'Conclue', value: conclue, color: '#4ade80', pct: Math.round((conclue / total) * 100) }
  ]

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMid, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>
        Entonnoir de conversion
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stages.map((stage, i) => {
          const width = Math.max(30, 100 - i * 18)
          return (
            <div key={stage.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 90, fontSize: 12, color: colors.textMid, textAlign: 'right', flexShrink: 0 }}>
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
              <div style={{ width: 60, fontSize: 13, fontWeight: 700, color: stage.color, flexShrink: 0 }}>
                {stage.value} <span style={{ fontSize: 11, color: colors.textDim }}>({stage.pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Monthly Trend Bar Chart (SVG pur) ─────────────────────────────────────────
function MonthlyTrendChart({ data }: { data: { month: string; conclue: number; total: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.total), 1)
  const chartH = 120

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMid, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>
        Activité mensuelle (6 derniers mois)
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: chartH + 32 }}>
        {data.map((d) => {
          const totalH = Math.round((d.total / maxVal) * chartH)
          const conclueH = d.total > 0 ? Math.round((d.conclue / d.total) * totalH) : 0
          return (
            <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 10, color: colors.textDim }}>{d.total > 0 ? d.total : ''}</div>
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
                    background: '#4ade80',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.6s ease'
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: colors.textMid, textAlign: 'center' }}>{d.month}</div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMid }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(96,165,250,0.4)' }} /> Total prospects
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMid }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#4ade80' }} /> Affaires conclues
        </div>
      </div>
    </div>
  )
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard({ members }: { members: MemberStat[] }) {
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMid, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>
        Classement de l'équipe
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {members.slice(0, 5).map((member, i) => {
          const maxConclue = members[0]?.conclue || 1
          const barWidth = Math.max(5, Math.round((member.conclue / maxConclue) * 100))
          return (
            <div
              key={member.uid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: i === 0 ? 'rgba(74,222,128,0.06)' : colors.bg3,
                borderRadius: 10,
                border: `1px solid ${i === 0 ? 'rgba(74,222,128,0.2)' : colors.border}`,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ width: 24, textAlign: 'center', fontSize: 16 }}>
                {medals[i] ?? `${i + 1}.`}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.name}
                </div>
                <div style={{ height: 4, background: colors.bg2, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${barWidth}%`, height: '100%', background: '#4ade80', borderRadius: 4, transition: 'width 0.8s ease' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80', lineHeight: 1 }}>{member.conclue}</div>
                <div style={{ fontSize: 10, color: colors.textMid }}>conclues</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 40 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: member.conversionRate >= 50 ? '#4ade80' : member.conversionRate >= 25 ? '#fbbf24' : colors.textMid }}>
                  {member.conversionRate}%
                </div>
                <div style={{ fontSize: 10, color: colors.textMid }}>taux</div>
              </div>
            </div>
          )
        })}
        {members.length === 0 && (
          <div style={{ textAlign: 'center', color: colors.textMid, fontSize: 13, padding: '24px 0' }}>
            Aucune donnée disponible. Les statistiques apparaîtront ici dès que votre équipe commencera à enregistrer des prospects.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Support Activity Section ──────────────────────────────────────────────────
function SupportActivitySection({ stats }: { stats: NonNullable<ReportingData['supportStats']> }) {
  const resolutionRate = stats.ticketsCount > 0
    ? Math.round((stats.resolvedTicketsCount / stats.ticketsCount) * 100)
    : 0

  const CALL_STATUS_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
    connected:  { label: 'Décroché',    color: '#4ade80', emoji: '✅' },
    no_answer:  { label: 'Non joint',   color: '#f59e0b', emoji: '📵' },
    busy:       { label: 'Occupé',      color: '#f97316', emoji: '🔴' },
    voicemail:  { label: 'Répondeur',   color: '#a78bfa', emoji: '📬' },
    failed:     { label: 'Échec',       color: '#f87171', emoji: '❌' }
  }

  const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    low:    { label: 'Basse',   color: '#60a5fa' },
    medium: { label: 'Moyenne', color: '#f59e0b' },
    high:   { label: 'Haute',   color: '#f97316' },
    urgent: { label: 'Urgente', color: '#f87171' }
  }

  const TICKET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    open:        { label: 'Ouvert',    color: '#f87171' },
    in_progress: { label: 'En cours',  color: '#f59e0b' },
    resolved:    { label: 'Résolu',    color: '#4ade80' },
    closed:      { label: 'Fermé',     color: '#94a3b8' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Support KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <KpiCard
          label="Appels support"
          value={stats.callsCount}
          sub="Passés par vos agents"
          color="#60a5fa"
          icon="📞"
        />
        <KpiCard
          label="Total tickets SAV"
          value={stats.ticketsCount}
          sub="Créés pour vos clients"
          color="#f59e0b"
          icon="🎫"
        />
        <KpiCard
          label="Tickets ouverts"
          value={stats.openTicketsCount}
          sub="En attente de résolution"
          color="#f87171"
          icon="⏳"
        />
        <KpiCard
          label="Taux de résolution"
          value={`${resolutionRate}%`}
          sub="Tickets résolus ou fermés"
          color={resolutionRate >= 70 ? '#4ade80' : '#f59e0b'}
          icon="✓"
        />
      </div>

      {/* Two-column layout for recent logs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Calls Log */}
        <div style={{
          background: colors.bg2,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: colors.text }}>
              📞 Journal des Appels Clients
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.textMid }}>
              Les 50 derniers appels de support passés par vos agents.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
            {stats.recentCalls.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.textMid, textAlign: 'center', padding: '30px 0' }}>
                Aucun appel enregistré pour le moment.
              </p>
            ) : stats.recentCalls.map(call => (
              <div key={call.id} style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: '12px 14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 13, color: colors.text }}>
                    {call.clientName || 'Client inconnu'}
                  </strong>
                  <span style={{ fontSize: 11, color: colors.textDim }}>
                    {new Date(call.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 4,
                    background: `${CALL_STATUS_LABELS[call.status]?.color}22`,
                    color: CALL_STATUS_LABELS[call.status]?.color
                  }}>
                    {CALL_STATUS_LABELS[call.status]?.emoji} {CALL_STATUS_LABELS[call.status]?.label}
                  </span>
                  <span style={{ fontSize: 11, color: colors.textMid }}>
                    par {call.agentName}
                  </span>
                </div>
                {call.notes && (
                  <p style={{ fontSize: 12, color: colors.textMid, margin: 0, lineHeight: 1.4, background: 'rgba(0,0,0,0.15)', padding: 8, borderRadius: 6 }}>
                    {call.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tickets Log */}
        <div style={{
          background: colors.bg2,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: colors.text }}>
              🎫 Tickets SAV / Réclamations
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.textMid }}>
              Les 50 derniers tickets de support de vos clients.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
            {stats.recentTickets.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.textMid, textAlign: 'center', padding: '30px 0' }}>
                Aucun ticket SAV ouvert pour le moment.
              </p>
            ) : stats.recentTickets.map(ticket => (
              <div key={ticket.id} style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: '12px 14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: 13, color: colors.text }}>
                    {ticket.clientName}
                  </strong>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: `${PRIORITY_LABELS[ticket.priority]?.color}22`,
                    color: PRIORITY_LABELS[ticket.priority]?.color
                  }}>
                    {PRIORITY_LABELS[ticket.priority]?.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
                  {ticket.subject}
                </div>
                {ticket.description && (
                  <p style={{ fontSize: 12, color: colors.textMid, margin: '0 0 8px', lineHeight: 1.4 }}>
                    {ticket.description}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: colors.textDim }}>
                  <span>Par {ticket.agentName}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                    background: `${TICKET_STATUS_LABELS[ticket.status]?.color}22`,
                    color: TICKET_STATUS_LABELS[ticket.status]?.color
                  }}>
                    {TICKET_STATUS_LABELS[ticket.status]?.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard Component ──────────────────────────────────────────────────
export function ReportingDashboard({ data }: { data: ReportingData }) {
  const [section, setSection] = useState<'sales' | 'support'>('sales')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Tab Selector */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, gap: 12 }}>
        <button
          onClick={() => setSection('sales')}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: section === 'sales' ? `2px solid ${colors.green}` : '2px solid transparent',
            color: section === 'sales' ? colors.green : colors.textMid,
            fontWeight: section === 'sales' ? 700 : 500,
            cursor: 'pointer',
            fontSize: 14,
            transition: 'all 150ms'
          }}
        >
          📊 Ventes & Conversion
        </button>
        {data.supportStats && (
          <button
            onClick={() => setSection('support')}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: section === 'support' ? `2px solid ${colors.green}` : '2px solid transparent',
              color: section === 'support' ? colors.green : colors.textMid,
              fontWeight: section === 'support' ? 700 : 500,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 150ms'
            }}
          >
            🎧 Activité Support SAV
          </button>
        )}
      </div>

      {section === 'sales' ? (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <KpiCard
              label="Total prospects"
              value={data.totalItems}
              sub={`Toute l'équipe`}
              color="#60a5fa"
              icon="📋"
            />
            <KpiCard
              label="Affaires conclues"
              value={data.totalConclue}
              sub={`Sur ${data.totalItems} prospects`}
              color="#4ade80"
              icon="✅"
            />
            <KpiCard
              label="Taux de conversion"
              value={`${data.overallConversionRate}%`}
              sub="Prospection → Clôture"
              color={data.overallConversionRate >= 30 ? '#4ade80' : '#fbbf24'}
              icon="📈"
            />
            <KpiCard
              label="Meilleur commercial"
              value={data.topPerformer ?? '—'}
              sub="Par nb d'affaires conclues"
              color="#fbbf24"
              icon="🏆"
            />
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div
              style={{
                background: colors.bg2,
                border: `1px solid ${colors.border}`,
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
                background: colors.bg2,
                border: `1px solid ${colors.border}`,
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
              background: colors.bg2,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 24
            }}
          >
            <Leaderboard members={data.memberStats} />
          </div>
        </>
      ) : (
        data.supportStats && <SupportActivitySection stats={data.supportStats} />
      )}
    </div>
  )
}

