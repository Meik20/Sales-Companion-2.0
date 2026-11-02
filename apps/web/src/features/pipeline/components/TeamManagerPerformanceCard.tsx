'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, Calendar, X, Users, Users2, Building2, Check, AlertTriangle, Trophy, Banknote, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { formatCompactAmount } from '@/lib/formatters'
import { useProspectingCountryDetails } from '@/hooks/useProspectingCountry'
import type { OrgManagerStats, OrgPipelineItem } from '@/features/pipeline/hooks/useOrgPipeline'
import type { MemberTarget } from '@/features/pipeline/hooks/useTeamTargets'
import {
  getAvailableMonthPeriods,
  getOrgMonthPeriod,
  getMonthPeriodLabel
} from '@/lib/monthly-cycle'
import {
  calculatePipelineStats,
  calculateAttainmentRate,
  calculateRoRate
} from '@/lib/pipeline-metrics'
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
  /** Effectif commercial actif réel de l'équipe (strictement issu de members) */
  membersCount?: number
  /** Devise officielle de l'organisation */
  currency?: string
  /** Période mensuelle sélectionnée (ex: '2026-11', '2026-10') pour les bilans */
  selectedPeriod?: string
  /** Callback lors du changement de période historique */
  onSelectPeriod?: (period: string) => void
  /** Code pays pour la timezone officielle (ex: 'CM') */
  countryCode?: string
}

function safeParseDate(val: unknown): Date | null {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  if (typeof val === 'string') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof val === 'number') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof val === 'object' && val !== null) {
    if ('toDate' in val && typeof (val as { toDate?: () => unknown }).toDate === 'function') {
      const d = (val as { toDate: () => unknown }).toDate()
      if (d instanceof Date && !isNaN(d.getTime())) return d
    }
    if ('_seconds' in val && typeof (val as { _seconds?: unknown })._seconds === 'number') {
      const d = new Date((val as { _seconds: number })._seconds * 1000)
      return isNaN(d.getTime()) ? null : d
    }
    if ('seconds' in val && typeof (val as { seconds?: unknown }).seconds === 'number') {
      const d = new Date((val as { seconds: number }).seconds * 1000)
      return isNaN(d.getTime()) ? null : d
    }
  }
  return null
}

export function TeamManagerPerformanceCard({
  manager,
  managers,
  items,
  onClear,
  targets,
  context = 'org',
  membersCount,
  currency: orgCurrency,
  selectedPeriod,
  onSelectPeriod,
  countryCode
}: TeamManagerPerformanceCardProps) {
  const { t, lang } = useTranslation()
  const { currency: fallbackCurrency } = useProspectingCountryDetails()
  const currency = orgCurrency || fallbackCurrency || 'XAF'
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const isGlobal = !manager
  const [showOverdueDrawer, setShowOverdueDrawer] = useState(false)

  // Résolution de la période active (avec timezone organisation) et liste des 6 derniers mois pour les bilans
  const currentMonthPeriod = useMemo(() => getOrgMonthPeriod(countryCode), [countryCode])
  const activePeriod = selectedPeriod || targets?.period || currentMonthPeriod
  const availablePeriods = useMemo(() => getAvailableMonthPeriods(6, countryCode), [countryCode])

  // Bornes inconditionnelles de la période sélectionnée (du 1er à 00:00 au dernier jour à 23:59:59)
  const periodBounds = useMemo(() => {
    let year: number
    let month: number
    if (activePeriod) {
      const parts = activePeriod.split('-').map(Number)
      year = parts[0]!
      month = parts[1]!
    } else {
      const now = new Date()
      year = now.getFullYear()
      month = now.getMonth() + 1
    }
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
    const end = new Date(year, month, 0, 23, 59, 59, 999)
    return { start, end }
  }, [activePeriod])

  const stats = useMemo(() => {
    let prospectionCount = 0
    let negociationCount = 0
    let conclueCount = 0
    let concludedAmount = 0
    let activePipelineAmount = 0
    let overdueCount = 0
    let stagnantCount = 0
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
        // Détection de stagnation (> 14 jours sans avancement)
        const refDate = safeParseDate((item as Record<string, unknown>).assignedAt || item.createdAt)
        if (refDate && Date.now() - refDate.getTime() > 14 * 24 * 3600 * 1000) {
          stagnantCount++
        }
      } else if (['negociation', 'negotiation', 'in_progress', 'en_cours'].includes(st)) {
        negociationCount++
        activePipelineAmount += amt
        // Détection de stagnation (> 30 jours sans closing)
        const refDate = safeParseDate((item as Record<string, unknown>).assignedAt || item.createdAt)
        if (refDate && Date.now() - refDate.getTime() > 30 * 24 * 3600 * 1000) {
          stagnantCount++
        }
      } else if (['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(st)) {
        // Remise à zéro inconditionnelle au 1er du mois :
        // Seules les affaires dont la date de conclusion tombe STRICTEMENT dans le mois actif sont comptées
        const concludedDate = safeParseDate((item as Record<string, unknown>).concludedAt ?? item.updatedAt)
        const inPeriod =
          Boolean(concludedDate) &&
          concludedDate! >= periodBounds.start &&
          concludedDate! <= periodBounds.end
        if (inPeriod) {
          conclueCount++
          concludedAmount += amt
        }
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
      activeCount: prospectionCount + negociationCount,
      prospectionCount,
      negociationCount,
      conclueCount,
      concludedAmount,
      activePipelineAmount,
      overdueCount,
      stagnantCount,
      memberCount: memberIds.size,
      teamManagersCount,
      unassignedCount,
      conversionRate: items.length > 0 ? Math.round((conclueCount / items.length) * 100) : 0
    }
  }, [items, manager?.uid, isGlobal, managers, todayStr, periodBounds])

  const initials = manager ? (manager.name || manager.email || 'TM').slice(0, 2).toUpperCase() : ''
  const isTeamContext = context === 'team'
  const effectiveMemberCount = membersCount != null ? membersCount : stats.memberCount

  return (
    <div
      style={{
        marginBottom: 16,
        background: 'var(--card, #131c2e)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: 'var(--shadow-elevation-1)'
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
                      ? (t('pipeline.globalTeamPerformance') || "Performance Globale de l'Équipe")
                      : (t('pipeline.globalOrgPerformance') || 'Performance Globale du Segment'))
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
                      : (t('pipeline.globalOrgSubtitle') || "Synthèse consolidée du chiffre d'affaires et du portefeuille du segment")}
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
                    {effectiveMemberCount}{' '}
                    {effectiveMemberCount > 1 ? t('pipeline.salespeople') : t('pipeline.salesperson')}
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
                    {effectiveMemberCount}{' '}
                    {effectiveMemberCount > 1 ? t('pipeline.salespeople') : t('pipeline.salesperson')}
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
          className="transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-elevation-2"
          style={{
            background: 'var(--card, #131c2e)',
            borderRadius: 12,
            padding: '12px 14px',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            boxShadow: 'var(--shadow-elevation-1)',
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
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground, #f1f5f9)', display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap', fontFamily: 'var(--font-heading, inherit)' }}>
            {stats.activeCount}
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground, #64748b)' }}>
              {stats.activeCount > 1 ? t('pipeline.leads') : t('pipeline.lead')}
            </span>
          </div>
          <div
            style={{ fontSize: 10.5, color: 'var(--muted-foreground, #64748b)', fontWeight: 500, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={`${stats.prospectionCount} ${t('pipeline.inProspection')} · ${stats.negociationCount} ${t('pipeline.inNegotiation')}`}
          >
            {stats.prospectionCount} {t('pipeline.inProspection')} · {stats.negociationCount} {t('pipeline.inNegotiation')}
          </div>
        </div>

        {/* 2. Valeur du pipeline */}
        <div
          className="transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-elevation-2"
          style={{
            background: 'var(--card, #131c2e)',
            borderRadius: 12,
            padding: '12px 14px',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            boxShadow: 'var(--shadow-elevation-1)',
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
          <div
            style={{ fontSize: 19, fontWeight: 800, color: 'var(--foreground, #f1f5f9)', display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap', fontFamily: 'var(--font-heading, inherit)' }}
            title={`${new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'fr-FR').format(stats.activePipelineAmount)} ${currency || 'XAF'}`}
          >
            {formatCompactAmount(stats.activePipelineAmount, lang)}
            <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--muted-foreground, #64748b)' }}>
              {currency || 'XAF'}
            </span>
          </div>
          <div
            style={{ fontSize: 10.5, color: 'var(--muted-foreground, #64748b)', fontWeight: 500, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
          className="group transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-elevation-2"
          style={{
            background: 'var(--card, #131c2e)',
            borderRadius: 12,
            padding: '12px 14px',
            border:
              stats.overdueCount > 0 || stats.stagnantCount > 0
                ? '1px solid rgba(239,68,68,0.4)'
                : '1px solid var(--border, rgba(255,255,255,0.08))',
            boxShadow: 'var(--shadow-elevation-1)',
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
            stats.overdueCount > 0 || stats.stagnantCount > 0
              ? (t('pipeline.overdueRequiresAttention') || 'Relances ou leads stagnants nécessitant attention')
              : (t('pipeline.upToDate') || 'À jour')
          }
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: stats.overdueCount > 0 || stats.stagnantCount > 0 ? 'var(--pipeline-alert-color, #b91c1c)' : 'var(--pipeline-progress-color, #1d4ed8)',
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
            {(stats.overdueCount > 0 || stats.stagnantCount > 0) && (
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
              fontSize: 17,
              fontWeight: 800,
              color: stats.overdueCount > 0 || stats.stagnantCount > 0 ? 'var(--pipeline-alert-color, #b91c1c)' : 'var(--pipeline-concluded-color, #047857)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
              fontFamily: 'var(--font-heading, inherit)'
            }}
          >
            {stats.overdueCount > 0 || stats.stagnantCount > 0 ? (
              <>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                  {stats.overdueCount > 0 ? `${stats.overdueCount} ${t('pipeline.overdueAlert')}` : ''}
                  {stats.overdueCount > 0 && stats.stagnantCount > 0 ? ' · ' : ''}
                  {stats.stagnantCount > 0 ? `${stats.stagnantCount} ${lang === 'en' ? 'stagnant' : 'stagnant(s)'}` : ''}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: 6,
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
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: '#10b981',
                    color: '#ffffff',
                    boxShadow: '0 1px 4px rgba(16, 185, 129, 0.35)',
                    flexShrink: 0
                  }}
                >
                  <Check size={11} strokeWidth={3} />
                </span>
              </>
            )}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted-foreground, #94a3b8)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stats.overdueCount > 0 || stats.stagnantCount > 0
              ? (isGlobal && !isTeamContext
                  ? (lang === 'en' ? 'Follow-ups or stagnant leads requiring action' : 'Relances ou leads stagnants nécessitant attention')
                  : (lang === 'en' ? 'Follow-ups or stagnant leads on team' : "Relances expirées ou leads stagnants sur l'équipe"))
              : (isGlobal && !isTeamContext
                  ? t('pipeline.noOverdueOnOrg')
                  : t('pipeline.noOverdueOnTeam'))}
          </div>
        </div>

        {/* 4. Réalisations — Volume / Valeur / Taux R/O */}
        {(() => {
          const tgtVol = targets?.targetVolume ?? null
          const tgtVal = targets?.targetValue ?? null
          const volPct = calculateAttainmentRate(stats.conclueCount, tgtVol)
          const valPct = calculateAttainmentRate(stats.concludedAmount, tgtVal)

          const hasTargets = tgtVol != null || tgtVal != null
          const roRate = calculateRoRate(volPct, valPct, stats.conversionRate)

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
              className="transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-elevation-2"
              style={{
                background: 'var(--card, #131c2e)',
                borderRadius: 12,
                padding: '12px 14px',
                border: '1px solid var(--border, rgba(255,255,255,0.08))',
                boxShadow: 'var(--shadow-elevation-1)',
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
                {onSelectPeriod ? (
                  <select
                    value={activePeriod}
                    onChange={(e) => onSelectPeriod(e.target.value)}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: hasTargets ? '#f59e0b' : 'var(--foreground, #f1f5f9)',
                      background: 'var(--card, #131c2e)',
                      border: `1px solid ${hasTargets ? 'rgba(245, 158, 11, 0.4)' : 'var(--border, rgba(255,255,255,0.12))'}`,
                      borderRadius: 6,
                      padding: '1px 6px',
                      cursor: 'pointer',
                      outline: 'none',
                      flexShrink: 0,
                      fontFamily: 'inherit'
                    }}
                    title={
                      lang === 'en'
                        ? 'Select historical month for performance review'
                        : 'Sélectionner un mois pour la réunion de bilan'
                    }
                  >
                    {availablePeriods.map((p) => {
                      const isCurrent = p.key === currentMonthPeriod
                      const label = isCurrent
                        ? (lang === 'en' ? `${p.key} (Current)` : `${p.key} (En cours)`)
                        : `${p.key} (${getMonthPeriodLabel(p, lang)})`
                      return (
                        <option
                          key={p.key}
                          value={p.key}
                          style={{
                            background: '#131c2e',
                            color: '#ffffff'
                          }}
                        >
                          {label}
                        </option>
                      )
                    })}
                  </select>
                ) : (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: hasTargets ? 'var(--pipeline-warning-color, #b45309)' : 'var(--muted-foreground, #64748b)',
                      background: hasTargets ? 'rgba(180, 83, 9, 0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${hasTargets ? 'rgba(180, 83, 9, 0.25)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 5,
                      padding: '1px 6px',
                      flexShrink: 0,
                      whiteSpace: 'nowrap'
                    }}
                    title={
                      targets?.period
                        ? `Période active : ${targets.period}`
                        : `Période active : ${activePeriod}${hasTargets ? '' : ' (Sans objectif défini)'}`
                    }
                  >
                    {targets?.period || activePeriod}
                  </span>
                )}
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
                      letterSpacing: '0.04em',
                      cursor: 'help'
                    }}
                    title={
                      lang === 'en'
                        ? "Volume: Closed deals vs Volume target for the period (volume attainment rate)"
                        : "Volume : Affaires conclues vs Objectif de volume sur la période (taux d'atteinte)"
                    }
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
                      letterSpacing: '0.04em',
                      cursor: 'help'
                    }}
                    title={
                      lang === 'en'
                        ? "Value: Closed revenue vs Financial target for the period (value attainment rate)"
                        : "Valeur : Chiffre d'affaires conclu vs Objectif financier sur la période (taux d'atteinte)"
                    }
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
                        <span>{formatCompactAmount(stats.concludedAmount, lang)}</span>
                        <span
                          style={{
                            fontWeight: 500,
                            color: 'var(--muted-foreground, #64748b)',
                            fontSize: 9.5
                          }}
                        >
                          {' '}/ {formatCompactAmount(tgtVal, lang)}{' '}{currency || 'XAF'}
                          {valPct !== null && ` (${valPct}%)`}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>{formatCompactAmount(stats.concludedAmount, lang)}</span>
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
                  flexDirection: 'column',
                  gap: 3,
                  paddingTop: 3,
                  borderTop: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: 'var(--muted-foreground, #64748b)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      cursor: 'help'
                    }}
                    title={
                      lang === 'en'
                        ? "R/O Rate (Realized / Objective): composite average of Volume and Value attainment rates"
                        : "Taux R/O (Réalisé / Objectif) : moyenne composite des taux d'atteinte en volume et en valeur"
                    }
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
                {hasTargets && (
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
                        width: `${Math.min(roRate, 100)}%`,
                        borderRadius: 4,
                        background: roColor,
                        transition: 'width 600ms ease'
                      }}
                    />
                  </div>
                )}
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
