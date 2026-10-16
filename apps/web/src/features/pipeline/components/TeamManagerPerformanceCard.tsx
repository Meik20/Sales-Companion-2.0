'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, Calendar, X, Users, Users2, Building2, Check, AlertTriangle, Trophy, Banknote, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { useProspectingCountryDetails } from '@/hooks/useProspectingCountry'
import type { OrgManagerStats, OrgPipelineItem } from '@/features/pipeline/hooks/useOrgPipeline'
import type { MemberTarget } from '@/features/pipeline/hooks/useTeamTargets'
import { OverdueFollowUpsDrawer } from './OverdueFollowUpsDrawer'

interface TeamManagerPerformanceCardProps {
  manager?: OrgManagerStats
  managers?: OrgManagerStats[]
  items: OrgPipelineItem[]
  onClear?: () => void
  /** Objectifs du manager (volume cible & valeur cible) */
  targets?: MemberTarget | null
  /** 'org' = Senior Manager (défaut) | 'team' = Team Manager */
  context?: 'org' | 'team'
}

export function TeamManagerPerformanceCard({
  manager,
  managers,
  items,
  onClear,
  targets,
  context = 'org'
}: TeamManagerPerformanceCardProps) {
  const { t, lang } = useTranslation()
  const { currency } = useProspectingCountryDetails()
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const isGlobal = !manager
  const [showOverdueDrawer, setShowOverdueDrawer] = useState(false)

  const formatCompactAmount = (val: number) => {
    if (val >= 1_000_000) {
      const num = val / 1_000_000
      return `${num >= 10 ? Math.round(num) : num.toFixed(1).replace('.0', '')}M`
    }
    if (val >= 10_000) {
      return `${Math.round(val / 1_000)}k`
    }
    if (val >= 1_000) {
      return `${(val / 1_000).toFixed(1).replace('.0', '')}k`
    }
    return String(val)
  }

  const stats = useMemo(() => {
    let prospectionCount = 0
    let negociationCount = 0
    let conclueCount = 0
    let concludedAmount = 0
    let activePipelineAmount = 0
    let overdueCount = 0
    let unassignedCount = 0
    const memberIds = new Set<string>()

    for (const item of items) {
      const st = (item.status || '').toLowerCase().trim()
      const isAssigned = isGlobal
        ? Boolean(item.assignedTo)
        : Boolean(item.assignedTo && item.assignedTo !== manager?.uid)

      if (isAssigned && item.assignedTo) {
        memberIds.add(item.assignedTo as string)
      } else {
        unassignedCount++
      }

      const amt = Number(item.amount) || 0

      if (['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead'].includes(st)) {
        prospectionCount++
        activePipelineAmount += amt
      } else if (['negociation', 'negotiation', 'in_progress', 'en_cours'].includes(st)) {
        negociationCount++
        activePipelineAmount += amt
      } else if (['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(st)) {
        conclueCount++
        concludedAmount += amt
      }

      const followUp =
        (item.nextFollowUp as string | undefined) ||
        (item.nextActionDate as string | undefined) ||
        (item.reminderDate as string | undefined)

      if (followUp && followUp < todayStr && !['conclue', 'conclusion', 'won', 'closed'].includes(st)) {
        overdueCount++
      }
    }

    const teamManagersCount = managers
      ? managers.filter((m) => !m.isSenior).length
      : 0

    return {
      totalCount: items.length,
      prospectionCount,
      negociationCount,
      conclueCount,
      concludedAmount,
      activePipelineAmount,
      overdueCount,
      memberCount: memberIds.size,
      teamManagersCount,
      unassignedCount
    }
  }, [items, manager?.uid, isGlobal, managers, todayStr])

  const initials = manager ? (manager.name || manager.email || 'TM').slice(0, 2).toUpperCase() : ''
  const isTeamContext = context === 'team'

  return (
    <div
      style={{
        marginBottom: 16,
        background: 'var(--card, #131c2e)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}
    >
      {/* ── Header : Organisation ou Team Manager ───────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: isGlobal
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 14,
              boxShadow: isGlobal
                ? '0 2px 8px rgba(139,92,246,0.35)'
                : '0 2px 8px rgba(99,102,241,0.35)',
              flexShrink: 0
            }}
          >
            {isGlobal ? (
              isTeamContext ? <Users2 size={18} /> : <Building2 size={18} />
            ) : (
              initials
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--foreground, #f1f5f9)'
                }}
              >
                {isGlobal
                  ? (isTeamContext
                      ? (t('pipeline.globalTeamPerformance') || "Performance Globale de l'\u00c9quipe")
                      : (t('pipeline.globalOrgPerformance') || "Performance Globale de l'Organisation"))
                  : (manager?.name || manager?.email)}
              </h4>
              <span
                style={{
                  fontSize: 10.5,
                  padding: '2px 9px',
                  borderRadius: 12,
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--primary, #4338ca)',
                  border: '1px solid rgba(99, 102, 241, 0.28)',
                  fontWeight: 700
                }}
              >
                  {isGlobal
                  ? (isTeamContext
                      ? (t('pipeline.teamConsolidated') || 'Vue Équipe')
                      : (t('pipeline.orgConsolidated') || 'Vue Consolidée'))
                  : 'Team Manager'}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted-foreground, #94a3b8)',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap'
              }}
            >
              {isGlobal ? (
                <>
                  <span>
                    {isTeamContext
                      ? (t('pipeline.globalTeamSubtitle') || "Synthèse consolidée du chiffre d'affaires et du portefeuille de l'équipe")
                      : (t('pipeline.globalOrgSubtitle') || "Synthèse consolidée du chiffre d'affaires et du portefeuille de l'organisation")}
                  </span>
                  {!isTeamContext && (
                    <>
                      <span>•</span>
                      <span>
                        {stats.teamManagersCount}{' '}
                        {stats.teamManagersCount > 1
                          ? t('pipeline.teamManagerCount_other')
                          : t('pipeline.teamManagerCount_one')}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} />
                    {stats.memberCount}{' '}
                    {stats.memberCount > 1 ? t('pipeline.salespeople') : t('pipeline.salesperson')}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {manager?.isSenior
                      ? t('pipeline.seniorStagingDesc')
                      : (t('pipeline.teamManagerSubtitle') || "Portefeuille opérationnel et métriques de l'équipe managée")}
                  </span>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} />
                    {stats.memberCount}{' '}
                    {stats.memberCount > 1 ? t('pipeline.salespeople') : t('pipeline.salesperson')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {!isGlobal && onClear && (
          <button
            type="button"
            onClick={onClear}
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              background: 'var(--secondary, #1e2a3b)',
              color: 'var(--muted-foreground, #94a3b8)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 150ms ease'
            }}
            title={t('pipeline.viewAllOrg') || "Voir toute l'organisation"}
          >
            <X size={12} />
            <span>{t('pipeline.viewAllOrg') || "Voir toute l'organisation"}</span>
          </button>
        )}
      </div>

      {/* ── Grille des 4 métriques de performance d'équipe ──────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {/* 1. Portefeuille actif */}
        <div
          style={{
            background: 'var(--card, #131c2e)',
            borderRadius: 10,
            padding: '10px 12px',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 4,
            minWidth: 0,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--pipeline-progress-color, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              minWidth: 0
            }}
          >
            <TrendingUp size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('pipeline.activePortfolio')}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground, #f1f5f9)', display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
            {stats.totalCount}
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground, #64748b)' }}>
              {stats.totalCount > 1 ? t('pipeline.leads') : t('pipeline.lead')}
            </span>
          </div>
          <div
            style={{ fontSize: 10, color: 'var(--muted-foreground, #64748b)', fontWeight: 500, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={`${stats.prospectionCount} ${t('pipeline.inProspection')} · ${stats.negociationCount} ${t('pipeline.inNegotiation')}`}
          >
            {stats.prospectionCount} {t('pipeline.inProspection')} · {stats.negociationCount} {t('pipeline.inNegotiation')}
          </div>
        </div>

        {/* 2. Valeur du pipeline */}
        <div
          style={{
            background: 'var(--card, #131c2e)',
            borderRadius: 10,
            padding: '10px 12px',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 4,
            minWidth: 0,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--pipeline-warning-color, #b45309)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              minWidth: 0
            }}
          >
            <Banknote size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('pipeline.pipelineValue')}
            </span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--foreground, #f1f5f9)', display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
            {new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'fr-FR').format(stats.activePipelineAmount)}
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted-foreground, #64748b)' }}>
              {currency || 'XAF'}
            </span>
          </div>
          <div
            style={{ fontSize: 10, color: 'var(--muted-foreground, #64748b)', fontWeight: 500, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={`${stats.prospectionCount} ${t('pipeline.inProspection')} · ${stats.negociationCount} ${t('pipeline.inNegotiation')}`}
          >
            {stats.prospectionCount} {t('pipeline.inProspection')} · {stats.negociationCount} {t('pipeline.inNegotiation')}
          </div>
        </div>

        {/* 3. Relances & Suivi équipe / organisation */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowOverdueDrawer(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setShowOverdueDrawer(true)
            }
          }}
          className="group transition-all duration-150 hover:shadow-md"
          style={{
            background: 'var(--card, #131c2e)',
            borderRadius: 10,
            padding: '10px 12px',
            border:
              stats.overdueCount > 0
                ? '1px solid rgba(239,68,68,0.4)'
                : '1px solid var(--border, rgba(255,255,255,0.08))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 4,
            cursor: 'pointer',
            outline: 'none',
            minWidth: 0,
            overflow: 'hidden'
          }}
          title={
            stats.overdueCount > 0
              ? (t('pipeline.overdueRequiresAttention') || 'Relances nécessitant attention')
              : (t('pipeline.upToDate') || 'À jour')
          }
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: stats.overdueCount > 0 ? 'var(--pipeline-alert-color, #b91c1c)' : 'var(--pipeline-progress-color, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
              minWidth: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
              <Calendar size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t('pipeline.followUpAndAlerts')}
              </span>
            </div>
            {stats.overdueCount > 0 && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexShrink: 0
                }}
                className="opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              >
                {t('pipeline.detailsLink')} <ArrowRight size={9} />
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: stats.overdueCount > 0 ? 'var(--pipeline-alert-color, #b91c1c)' : 'var(--pipeline-concluded-color, #047857)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4
            }}
          >
            {stats.overdueCount > 0 ? (
              <>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
                  {stats.overdueCount} {t('pipeline.overdueAlert')}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: 'rgba(239, 68, 68, 0.16)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#ef4444',
                    flexShrink: 0
                  }}
                >
                  <AlertTriangle size={11} strokeWidth={2.5} />
                </span>
              </>
            ) : (
              <>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
                  {t('pipeline.upToDate')}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: '#10b981',
                    color: '#ffffff',
                    boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)',
                    flexShrink: 0
                  }}
                >
                  <Check size={11} strokeWidth={3} />
                </span>
              </>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted-foreground, #94a3b8)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stats.overdueCount > 0
              ? (isGlobal && !isTeamContext
                  ? t('pipeline.allOrgOverdueRequiresAttention')
                  : t('pipeline.overdueRequiresAttention'))
              : (isGlobal && !isTeamContext
                  ? t('pipeline.noOverdueOnOrg')
                  : t('pipeline.noOverdueOnTeam'))}
          </div>
        </div>

        {/* 4. Réalisations — Volume / Valeur / Taux R/O */}
        {(() => {
          const tgtVol = targets?.targetVolume ?? null
          const tgtVal = targets?.targetValue ?? null
          const volPct =
            tgtVol && tgtVol > 0
              ? Math.round((stats.conclueCount / tgtVol) * 100)
              : null
          const valPct =
            tgtVal && tgtVal > 0
              ? Math.round((stats.concludedAmount / tgtVal) * 100)
              : null

          const hasTargets = tgtVol != null || tgtVal != null

          const roRate = (() => {
            if (volPct != null && valPct != null) return Math.round((volPct + valPct) / 2)
            if (volPct != null) return volPct
            if (valPct != null) return valPct
            return stats.totalCount > 0
              ? Math.round((stats.conclueCount / stats.totalCount) * 100)
              : 0
          })()

          const roColor = hasTargets
            ? roRate >= 100
              ? 'var(--pipeline-concluded-color, #047857)'
              : roRate >= 70
                ? 'var(--pipeline-warning-color, #b45309)'
                : 'var(--pipeline-alert-color, #b91c1c)'
            : roRate >= 40
              ? 'var(--pipeline-concluded-color, #047857)'
              : roRate >= 20
                ? 'var(--pipeline-warning-color, #b45309)'
                : 'var(--pipeline-alert-color, #b91c1c)'

          const roBg = hasTargets
            ? roRate >= 100
              ? 'rgba(16, 185, 129, 0.12)'
              : roRate >= 70
                ? 'rgba(217, 119, 6, 0.12)'
                : 'rgba(239, 68, 68, 0.12)'
            : roRate >= 40
              ? 'rgba(16, 185, 129, 0.12)'
              : roRate >= 20
                ? 'rgba(217, 119, 6, 0.12)'
                : 'rgba(239, 68, 68, 0.12)'

          const roBorder = hasTargets
            ? roRate >= 100
              ? 'rgba(16, 185, 129, 0.35)'
              : roRate >= 70
                ? 'rgba(217, 119, 6, 0.35)'
                : 'rgba(239, 68, 68, 0.35)'
            : roRate >= 40
              ? 'rgba(16, 185, 129, 0.35)'
              : roRate >= 20
                ? 'rgba(217, 119, 6, 0.35)'
                : 'rgba(239, 68, 68, 0.35)'

          return (
            <div
              style={{
                background: 'var(--card, #131c2e)',
                borderRadius: 10,
                padding: '10px 12px',
                border: '1px solid var(--border, rgba(255,255,255,0.08))',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 5,
                minWidth: 0,
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--pipeline-warning-color, #b45309)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 4,
                  minWidth: 0
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
                  <Trophy size={12} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t('pipeline.achievements')}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: roColor,
                    background: roBg,
                    border: `1px solid ${roBorder}`,
                    borderRadius: 5,
                    padding: '1px 5px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}
                  title={hasTargets ? `${t('pipeline.roRateLabel')}: ${roRate}%` : `${t('pipeline.convRateLabel')}: ${roRate}%`}
                >
                  {`${roRate}%`}
                </span>
              </div>

              {/* Volume */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 600,
                      color: 'var(--muted-foreground, #64748b)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {t('pipeline.volumeLabel')}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: 'var(--foreground, #f1f5f9)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {stats.conclueCount}
                    {tgtVol != null && (
                      <span
                        style={{
                          fontWeight: 500,
                          color: 'var(--muted-foreground, #64748b)',
                          fontSize: 9.5
                        }}
                      >
                        {' '}/ {tgtVol}{volPct !== null && ` (${volPct}%)`}
                      </span>
                    )}
                  </span>
                </div>
                {/* Progress bar volume */}
                {tgtVol != null && tgtVol > 0 && (
                  <div
                    style={{
                      height: 3,
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(volPct ?? 0, 100)}%`,
                        borderRadius: 4,
                        background:
                          (volPct ?? 0) >= 80
                            ? 'var(--pipeline-concluded-color, #047857)'
                            : (volPct ?? 0) >= 40
                              ? 'var(--pipeline-warning-color, #b45309)'
                              : 'var(--pipeline-alert-color, #b91c1c)',
                        transition: 'width 600ms ease'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Valeur */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: 'var(--muted-foreground, #64748b)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {t('pipeline.valueLabel')}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: 'var(--foreground, #f1f5f9)',
                      whiteSpace: 'nowrap'
                    }}
                    title={
                      tgtVal != null
                        ? `${new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'fr-FR').format(stats.concludedAmount)} / ${new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'fr-FR').format(tgtVal)} ${currency || 'XAF'}${valPct !== null ? ` (${valPct}%)` : ''}`
                        : `${new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'fr-FR').format(stats.concludedAmount)} ${currency || 'XAF'}`
                    }
                  >
                    {tgtVal != null ? (
                      <>
                        <span>{formatCompactAmount(stats.concludedAmount)}</span>
                        <span
                          style={{
                            fontWeight: 500,
                            color: 'var(--muted-foreground, #64748b)',
                            fontSize: 9.5
                          }}
                        >
                          {' '}/ {formatCompactAmount(tgtVal)}{' '}{currency || 'XAF'}
                          {valPct !== null && ` (${valPct}%)`}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>{formatCompactAmount(stats.concludedAmount)}</span>
                        <span
                          style={{
                            fontWeight: 500,
                            color: 'var(--muted-foreground, #64748b)',
                            fontSize: 9.5
                          }}
                        >
                          {' '}{currency || 'XAF'}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                {/* Progress bar valeur */}
                {tgtVal != null && tgtVal > 0 && (
                  <div
                    style={{
                      height: 3,
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(valPct ?? 0, 100)}%`,
                        borderRadius: 4,
                        background:
                          (valPct ?? 0) >= 80
                            ? 'var(--pipeline-concluded-color, #047857)'
                            : (valPct ?? 0) >= 40
                              ? 'var(--pipeline-warning-color, #b45309)'
                              : 'var(--pipeline-alert-color, #b91c1c)',
                        transition: 'width 600ms ease'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Taux R/O */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 2,
                  borderTop: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: 'var(--muted-foreground, #64748b)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {t('pipeline.roRateLabel')}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: roColor
                  }}
                >
                  {roRate}%
                </span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Tiroir des relances et alertes détaillées ────────────────── */}
      <OverdueFollowUpsDrawer
        open={showOverdueDrawer}
        onClose={() => setShowOverdueDrawer(false)}
        items={items}
        currency={currency || 'FCFA'}
        context={context}
        managers={managers}
      />
    </div>
  )
}
