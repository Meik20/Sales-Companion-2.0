'use client'

import { useMemo } from 'react'
import { TrendingUp, CheckCircle2, Calendar, X, Users, Users2, Building2, Check, AlertTriangle, Trophy } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { useProspectingCountryDetails } from '@/hooks/useProspectingCountry'
import type { OrgManagerStats, OrgPipelineItem } from '@/features/pipeline/hooks/useOrgPipeline'
import type { MemberTarget } from '@/features/pipeline/hooks/useTeamTargets'

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
  const { t } = useTranslation()
  const { currency } = useProspectingCountryDetails()
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const isGlobal = !manager

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
            {isGlobal ? (isTeamContext ? <Users2 size={18} /> : <Building2 size={18} />) : initials}
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
                  padding: '1px 8px',
                  borderRadius: 12,
                  background: isGlobal ? 'rgba(139,92,246,0.15)' : 'rgba(99,102,241,0.15)',
                  color: isGlobal ? '#a78bfa' : '#818cf8',
                  fontWeight: 600
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
                      ? (t('pipeline.globalTeamSubtitle') || "Synth\u00e8se consolid\u00e9e du chiffre d'affaires et du portefeuille de l'\u00e9quipe")
                      : (t('pipeline.globalOrgSubtitle') || "Synth\u00e8se consolid\u00e9e du chiffre d'affaires et du portefeuille de l'organisation")}
                  </span>
                  {!isTeamContext && (
                    <>
                      <span>•</span>
                      <span>{stats.teamManagersCount} Team Managers</span>
                    </>
                  )}
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} />
                    {stats.memberCount} {stats.memberCount > 1 ? 'commerciaux' : 'commercial'}
                  </span>
                </>
              ) : (
                <>
                  <span>{t('pipeline.teamManagerSubtitle') || "Portefeuille op\u00e9rationnel et m\u00e9triques de l'\u00e9quipe manag\u00e9e"}</span>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} />
                    {stats.memberCount} {stats.memberCount > 1 ? 'commerciaux' : 'commercial'}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 1. Portefeuille actif */}
        <div
          style={{
            background: 'var(--card, #131c2e)',
            borderRadius: 10,
            padding: '11px 14px',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 4
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <TrendingUp size={12} />
            <span>{t('pipeline.activePortfolio') || 'Portefeuille actif'}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground, #f1f5f9)' }}>
            {stats.totalCount}{' '}
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground, #94a3b8)' }}>
              {stats.totalCount > 1 ? 'leads' : 'lead'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
            {stats.prospectionCount} en prospection · {stats.negociationCount} en négo
          </div>
        </div>

        {/* 2. Ventes conclues & CA encaissé */}
        <div
          style={{
            background: 'var(--card, #131c2e)',
            borderRadius: 10,
            padding: '11px 14px',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 4
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <CheckCircle2 size={12} />
            <span>{t('pipeline.closedSales') || 'Ventes conclues'}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399' }}>
            {stats.conclueCount}{' '}
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground, #94a3b8)' }}>
              {stats.conclueCount > 1 ? 'signatures' : 'signature'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
            {new Intl.NumberFormat('fr-FR').format(stats.concludedAmount)} {currency || 'FCFA'} {t('pipeline.encashed') || 'encaissés'}
          </div>
        </div>

        {/* 3. Relances & Suivi équipe / organisation */}
        <div
          style={{
            background: 'var(--card, #131c2e)',
            borderRadius: 10,
            padding: '11px 14px',
            border:
              stats.overdueCount > 0
                ? '1px solid rgba(239,68,68,0.3)'
                : '1px solid var(--border, rgba(255,255,255,0.08))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 4
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: stats.overdueCount > 0 ? '#ef4444' : '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Calendar size={12} />
            <span>{t('pipeline.followUpAndAlerts') || 'Relances & Suivi'}</span>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: stats.overdueCount > 0 ? '#ef4444' : '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: 7
            }}
          >
            {stats.overdueCount > 0 ? (
              <>
                <span>{stats.overdueCount} {t('pipeline.overdueAlert') || 'en retard'}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    background: 'rgba(239, 68, 68, 0.16)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#ef4444'
                  }}
                >
                  <AlertTriangle size={12} strokeWidth={2.5} />
                </span>
              </>
            ) : (
              <>
                <span>{t('pipeline.upToDate') || 'À jour'}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    background: '#10b981',
                    color: '#ffffff',
                    boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Check size={13} strokeWidth={3} />
                </span>
              </>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
            {stats.overdueCount > 0
              ? (isGlobal
                  ? (t('pipeline.allOrgOverdueRequiresAttention') || "Relances à traiter sur toute l'organisation")
                  : (t('pipeline.overdueRequiresAttention') || "Relances d'équipe nécessitant attention"))
              : (isGlobal
                  ? (t('pipeline.noOverdueOnOrg') || "Aucune relance expirée sur toute l'organisation")
                  : (t('pipeline.noOverdueOnTeam') || "Aucune relance expirée sur l'équipe"))}
          </div>
        </div>

        {/* 4. Réalisations — Volume / Valeur / Taux R/O */}
        {(() => {
          const tgtVol = targets?.targetVolume ?? null
          const tgtVal = targets?.targetValue ?? null
          const roRate =
            stats.totalCount > 0
              ? Math.round((stats.conclueCount / stats.totalCount) * 100)
              : 0
          const volPct =
            tgtVol && tgtVol > 0
              ? Math.round((stats.conclueCount / tgtVol) * 100)
              : null
          const valPct =
            tgtVal && tgtVal > 0
              ? Math.round((stats.concludedAmount / tgtVal) * 100)
              : null

          const roColor =
            roRate >= 40 ? '#34d399' : roRate >= 20 ? '#fbbf24' : '#f87171'

          return (
            <div
              style={{
                background: 'var(--card, #131c2e)',
                borderRadius: 10,
                padding: '11px 14px',
                border: '1px solid rgba(251,191,36,0.18)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 6
              }}
            >
              {/* Header */}
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 5
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Trophy size={12} />
                  <span>{t('pipeline.achievements') || 'Réalisations'}</span>
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: roColor,
                    background: `${roColor}18`,
                    border: `1px solid ${roColor}40`,
                    borderRadius: 6,
                    padding: '1px 6px'
                  }}
                >
                  R/O {roRate}%
                </span>
              </div>

              {/* Volume */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--muted-foreground, #94a3b8)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Volume
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--foreground, #f1f5f9)'
                    }}
                  >
                    {stats.conclueCount}
                    {tgtVol != null && (
                      <span
                        style={{
                          fontWeight: 400,
                          color: 'var(--muted-foreground, #94a3b8)',
                          fontSize: 10
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
                            ? '#34d399'
                            : (volPct ?? 0) >= 40
                              ? '#fbbf24'
                              : '#f87171',
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
                    justifyContent: 'space-between'
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--muted-foreground, #94a3b8)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Valeur
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--foreground, #f1f5f9)'
                    }}
                  >
                    {new Intl.NumberFormat('fr-FR').format(stats.concludedAmount)}
                    {tgtVal != null && (
                      <span
                        style={{
                          fontWeight: 400,
                          color: 'var(--muted-foreground, #94a3b8)',
                          fontSize: 10
                        }}
                      >
                        {' '}/ {new Intl.NumberFormat('fr-FR').format(tgtVal)}{' '}{currency || 'F'}
                        {valPct !== null && ` (${valPct}%)`}
                      </span>
                    )}
                    {tgtVal == null && (
                      <span
                        style={{
                          fontWeight: 400,
                          color: 'var(--muted-foreground, #94a3b8)',
                          fontSize: 10
                        }}
                      >
                        {' '}{currency || 'FCFA'}
                      </span>
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
                            ? '#34d399'
                            : (valPct ?? 0) >= 40
                              ? '#fbbf24'
                              : '#f87171',
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
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--muted-foreground, #94a3b8)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  Taux R/O
                </span>
                <span
                  style={{
                    fontSize: 12,
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
    </div>
  )
}
