'use client'

import { useMemo } from 'react'
import { TrendingUp, CheckCircle2, Calendar, Wallet, X, Users, Building2 } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import type { OrgManagerStats, OrgPipelineItem } from '@/features/pipeline/hooks/useOrgPipeline'

interface TeamManagerPerformanceCardProps {
  manager?: OrgManagerStats
  managers?: OrgManagerStats[]
  items: OrgPipelineItem[]
  onClear?: () => void
}

export function TeamManagerPerformanceCard({
  manager,
  managers,
  items,
  onClear
}: TeamManagerPerformanceCardProps) {
  const { t } = useTranslation()
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
            {isGlobal ? <Building2 size={18} /> : initials}
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
                  ? (t('pipeline.globalOrgPerformance') || "Performance Globale de l'Organisation")
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
                {isGlobal ? (t('pipeline.orgConsolidated') || 'Vue Consolidée') : 'Team Manager'}
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
                    {t('pipeline.globalOrgSubtitle') || "Synthèse consolidée du chiffre d'affaires et du portefeuille de l'organisation"}
                  </span>
                  <span>•</span>
                  <span>{stats.teamManagersCount} Team Managers</span>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} />
                    {stats.memberCount} {stats.memberCount > 1 ? 'commerciaux' : 'commercial'}
                  </span>
                </>
              ) : (
                <>
                  <span>{t('pipeline.teamManagerSubtitle') || "Portefeuille opérationnel et métriques de l'équipe managée"}</span>
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
            {new Intl.NumberFormat('fr-FR').format(stats.concludedAmount)} FCFA {t('pipeline.encashed') || 'encaissés'}
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
              color: stats.overdueCount > 0 ? '#ef4444' : '#34d399'
            }}
          >
            {stats.overdueCount > 0 ? (
              <span>{stats.overdueCount} {t('pipeline.overdueAlert') || 'en retard ⚠️'}</span>
            ) : (
              <span>{t('pipeline.upToDate') || 'À jour ✅'}</span>
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

        {/* 4. Valeur du pipeline & Affectation */}
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
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Wallet size={12} />
            <span>{t('pipeline.pipelineValue') || 'Valeur du pipeline'}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground, #f1f5f9)' }}>
            {new Intl.NumberFormat('fr-FR').format(stats.activePipelineAmount)}{' '}
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground, #94a3b8)' }}>
              FCFA
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
            {isGlobal ? (
              <>
                {stats.teamManagersCount} managers · {stats.memberCount} commerciaux · {stats.unassignedCount} {t('pipeline.unassignedLeads') || 'non assigné(s)'}
              </>
            ) : (
              <>
                {stats.memberCount} commercial{stats.memberCount > 1 ? 's' : ''} · {stats.unassignedCount} {t('pipeline.unassignedLeads') || 'non assigné(s)'}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
