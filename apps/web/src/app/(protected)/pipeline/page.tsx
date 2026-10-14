'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState, EmptyState } from '@/components/feedback/index'
import { DataCard, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useManagerPipeline } from '@/features/pipeline/hooks/useManagerPipeline'
import { ManagerPipelineList } from '@/features/pipeline/components/ManagerPipelineList'
import { useUserPipeline } from '@/features/pipeline/hooks/useUserPipeline'
import { CreatePipelineItemForm } from '@/features/pipeline/components/CreatePipelineItemForm'
import { UserPipelineList } from '@/features/pipeline/components/UserPipelineList'
import { useUpdatePipelineItem } from '@/features/pipeline/hooks/useUpdatePipelineItem'
import { useTeamMembers } from '@/features/team/hooks/useTeamMembers'
import { useExportTeamPerformance } from '@/features/pipeline/hooks/useExportTeamPerformance'
import { useTeamTargets, useSaveTeamTarget } from '@/features/pipeline/hooks/useTeamTargets'
import { useOrgPipeline, type OrgManagerStats } from '@/features/pipeline/hooks/useOrgPipeline'
import { TeamManagerPerformanceCard } from '@/features/pipeline/components/TeamManagerPerformanceCard'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from '@/providers/I18nProvider'
import { FileDown, Loader2, Target, Users2, Building2, TrendingUp, Filter } from 'lucide-react'

export default function PipelinePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useCurrentUser()

  // ── Rôles org ───────────────────────────────────────────────────────────
  const isSeniorManager = user?.role === 'manager' && user?.orgRole === 'senior_manager'
  const isTeamManager = user?.role === 'manager' && user?.orgRole !== 'senior_manager'

  // ── Org pipeline (Senior Manager uniquement) ─────────────────────────
  const [filterManagerUid, setFilterManagerUid] = useState<string | undefined>(undefined)
  const orgPipelineQuery = useOrgPipeline({ managerUid: filterManagerUid })
  const isSeniorSelected = Boolean(filterManagerUid && user?.uid && filterManagerUid === user.uid)
  const selectedManager = isSeniorSelected
    ? ({
        uid: user!.uid,
        name: user!.name || 'Compte Senior Manager',
        email: user!.email || '',
        orgRole: 'senior_manager',
        isSenior: true,
        isCurrent: true,
        stats: {
          prospection: 0,
          negociation: 0,
          conclue: 0,
          total: 0
        }
      } as unknown as OrgManagerStats)
    : filterManagerUid && orgPipelineQuery.data?.managers
      ? orgPipelineQuery.data.managers.find((m: OrgManagerStats) => m.uid === filterManagerUid)
      : undefined

  const managerPipelineQuery = useManagerPipeline()
  const userPipelineQuery = useUserPipeline()
  const updateMutation = useUpdatePipelineItem()
  const { data: members = [] } = useTeamMembers()
  const [showForm, setShowForm] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const { exportPerformance, loading: exportLoading } = useExportTeamPerformance()

  // ── Objectifs (indépendants uniquement) ──────────────────────────────────
  const [showTargets, setShowTargets] = useState(false)
  const [tgtVolume, setTgtVolume] = useState('')
  const [tgtValue, setTgtValue] = useState('')
  const [tgtPeriod, setTgtPeriod] = useState('')
  const isIndependent = user?.role === 'independent'
  const isFree = (user?.plan ?? 'free') === 'free'
  const { data: myTargets } = useTeamTargets(isIndependent ? user?.uid : undefined)
  // Objectifs du Team Manager (scopé sur son propre uid)
  const { data: tmTargets } = useTeamTargets(isTeamManager ? user?.uid : undefined)
  const tmTarget = tmTargets?.[0] ?? null
  // Objectifs du Senior Manager : récupérer les objectifs de son organisation (vue consolidée)
  const { data: smTargets } = useTeamTargets(undefined, isSeniorManager ? user?.uid : undefined)
  const smTarget = smTargets?.[0] ?? null
  const saveTarget = useSaveTeamTarget()
  const prevFreeRef = useRef<boolean>(isFree)

  // ── Fermeture immédiate et rafraîchissement si l'utilisateur repasse à FREE ──
  useEffect(() => {
    if (isFree) {
      setShowTargets(false)
      setShowExport(false)
    }

    // Détection du passage en direct de payant à FREE
    if (!prevFreeRef.current && isFree) {
      userPipelineQuery.refetch()
      router.refresh()
    }
    prevFreeRef.current = isFree
  }, [isFree, router, userPipelineQuery])

  // ── Écoute globale de rétrogradation en direct ───────────────────────────
  useEffect(() => {
    const handleDowngraded = () => {
      setShowTargets(false)
      setShowExport(false)
      userPipelineQuery.refetch()
      router.refresh()
    }

    window.addEventListener('sc:plan-downgraded', handleDowngraded)
    return () => window.removeEventListener('sc:plan-downgraded', handleDowngraded)
  }, [router, userPipelineQuery])

  // Pré-remplir avec les valeurs existantes quand elles arrivent
  useEffect(() => {
    if (!myTargets?.length) return
    const t0 = myTargets[0]!
    if (t0.targetVolume != null) setTgtVolume(String(t0.targetVolume))
    if (t0.targetValue != null) setTgtValue(String(t0.targetValue))
    if (t0.period) setTgtPeriod(t0.period)
  }, [myTargets])

  const stageParam = searchParams.get('stage')?.toLowerCase()
  const activeStage =
    stageParam === 'prospection' || stageParam === 'prospect'
      ? 'prospection'
      : stageParam === 'negociation' || stageParam === 'negotiation'
        ? 'negociation'
        : stageParam === 'conclue' || stageParam === 'conclusion'
          ? 'conclue'
          : null

  async function handleStatusChange(id: string, status: 'prospection' | 'negociation' | 'conclue') {
    await updateMutation.mutateAsync({ id, data: { status } })
  }

  function handleStageClick(stageId: 'prospection' | 'negociation' | 'conclue') {
    if (activeStage === stageId) {
      router.push('/pipeline')
    } else {
      router.push(`/pipeline?stage=${stageId}`)
    }
  }

  const items = userPipelineQuery.data ?? []
  const counts = {
    prospection: items.filter((i) => ['prospection', 'prospect'].includes(i.status as string))
      .length,
    negociation: items.filter((i) => ['negociation', 'negotiation'].includes(i.status as string))
      .length,
    conclue: items.filter((i) => ['conclue', 'conclusion'].includes(i.status as string)).length
  }

  const filteredItems = activeStage
    ? items.filter((i) => {
        if (activeStage === 'prospection')
          return ['prospection', 'prospect'].includes(i.status as string)
        if (activeStage === 'negociation')
          return ['negociation', 'negotiation'].includes(i.status as string)
        if (activeStage === 'conclue') return ['conclue', 'conclusion'].includes(i.status as string)
        return true
      })
    : items

  return (
    <AppShell>
      <PageHeader
        title={t('pipeline.title')}
        subtitle={t('pipeline.subtitle')}
        actions={
          user?.role === 'independent' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isFree) {
                    router.push('/upgrade?redirect=/pipeline')
                    return
                  }
                  setShowTargets((v) => !v)
                  setShowExport(false)
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Target size={14} />
                {showTargets && !isFree ? t('pipeline.cancel') : 'Objectifs'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isFree) {
                    router.push('/upgrade?redirect=/pipeline')
                    return
                  }
                  setShowExport((v) => !v)
                  setShowTargets(false)
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <FileDown size={14} />
                {showExport && !isFree ? t('pipeline.cancel') : 'Exporter'}
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
                {showForm ? t('pipeline.cancel') : t('pipeline.addProspect')}
              </Button>
            </div>
          ) : user?.role !== 'manager' ? (
            <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? t('pipeline.cancel') : t('pipeline.addProspect')}
            </Button>
          ) : undefined
        }
      />

      {/* Stats rapides */}
      {user?.role === 'member' || user?.role === 'independent' ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
          {[
            {
              id: 'prospection' as const,
              label: t('pipeline.prospection'),
              count: counts.prospection,
              color: '#60a5fa',
              variant: 'info' as const
            },
            {
              id: 'negociation' as const,
              label: t('pipeline.negotiation'),
              count: counts.negociation,
              color: '#fbbf24',
              variant: 'warning' as const
            },
            {
              id: 'conclue' as const,
              label: t('pipeline.closed'),
              count: counts.conclue,
              color: '#0284c7',
              variant: 'success' as const
            }
          ].map(({ id, label, count, color, variant }) => {
            const isSelected = activeStage === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleStageClick(id)}
                className={`group transition-all duration-200 cursor-pointer text-center relative rounded-xl ${
                  isSelected
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md'
                    : 'hover:border-primary/50 hover:shadow-sm'
                }`}
                style={{
                  background: isSelected ? 'var(--secondary, #1e293b)' : 'var(--card, #131c2e)',
                  border: isSelected
                    ? `2px solid ${color}`
                    : '1px solid var(--border, rgba(255,255,255,0.1))',
                  padding: '12px 10px',
                  outline: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  minWidth: 0
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color,
                    fontFamily: "'Syne',sans-serif",
                    lineHeight: 1
                  }}
                >
                  {count}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge variant={variant}>{label}</Badge>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color,
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title={t('search.clearStageFilter')}
                    >
                      ●
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════
           Vue SENIOR MANAGER — Pipeline consolidé de l'organisation
      ═══════════════════════════════════════════════════════════════ */}
      {isSeniorManager ? (
        <>
          {/* KPI Org globaux */}
          {orgPipelineQuery.data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-5">
              {[
                {
                  id: 'prospection',
                  label: t('pipeline.prospection') || 'Prospection',
                  count: orgPipelineQuery.data.counts.prospection,
                  color: '#60a5fa',
                  icon: <TrendingUp size={16} />
                },
                {
                  id: 'negociation',
                  label: t('pipeline.negotiation') || 'Négociation',
                  count: orgPipelineQuery.data.counts.negociation,
                  color: '#fbbf24',
                  icon: <Filter size={16} />
                },
                {
                  id: 'conclue',
                  label: t('pipeline.closed') || 'Conclus',
                  count: orgPipelineQuery.data.counts.conclue,
                  color: '#34d399',
                  icon: <Building2 size={16} />
                },
                {
                  id: 'total',
                  label: t('pipeline.totalOrg') || 'Total Org',
                  count: orgPipelineQuery.data.counts.total,
                  color: '#a78bfa',
                  icon: <Users2 size={16} />
                }
              ].map(({ id, label, count, color, icon }) => (
                <div
                  key={id}
                  style={{
                    background: 'var(--card, #131c2e)',
                    border: '1px solid var(--border, rgba(255,255,255,0.1))',
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minWidth: 0
                  }}
                  className="transition-all duration-150 hover:shadow-sm"
                >
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color,
                      fontFamily: "'Syne',sans-serif",
                      lineHeight: 1
                    }}
                  >
                    {count}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      color: 'var(--muted-foreground)',
                      fontSize: 12,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {icon} <span>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filtre par Team Manager */}
          {orgPipelineQuery.data?.managers &&
            orgPipelineQuery.data.managers.filter((m: OrgManagerStats) => !m.isSenior).length >
              0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--muted-foreground)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {t('pipeline.filterByTeamManager') || 'Filtrer par Team Manager :'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFilterManagerUid(undefined)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: !filterManagerUid
                        ? '1px solid #6366f1'
                        : '1px solid var(--border, rgba(255,255,255,0.1))',
                      background: !filterManagerUid
                        ? '#6366f1'
                        : 'var(--secondary, #1e2a3b)',
                      color: !filterManagerUid
                        ? '#ffffff'
                        : 'var(--foreground, #f1f5f9)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 150ms ease'
                    }}
                  >
                    <span>{t('pipeline.all') || 'Tous'}</span>
                  </button>
                  {orgPipelineQuery.data.managers
                    .filter((m: OrgManagerStats) => !m.isSenior)
                    .map((mgr: OrgManagerStats) => {
                      const isSelected = filterManagerUid === mgr.uid
                      return (
                        <button
                          key={mgr.uid}
                          type="button"
                          onClick={() =>
                            setFilterManagerUid(isSelected ? undefined : mgr.uid)
                          }
                          style={{
                            padding: '5px 12px',
                            borderRadius: 20,
                            border: isSelected
                              ? '1px solid #6366f1'
                              : '1px solid var(--border, rgba(255,255,255,0.1))',
                            background: isSelected
                              ? '#6366f1'
                              : 'var(--secondary, #1e2a3b)',
                            color: isSelected
                              ? '#ffffff'
                              : 'var(--foreground, #f1f5f9)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 150ms ease'
                          }}
                        >
                          <span>{mgr.name || mgr.email}</span>
                        </button>
                      )
                    })}
                  {(() => {
                    const seniorPendingCount = (orgPipelineQuery.data?.items ?? []).filter(
                      (i) =>
                        (i as any).managerOrgRole === 'senior_manager' ||
                        Boolean(user?.uid && (i as any).managerUid === user?.uid)
                    ).length
                    if (seniorPendingCount === 0) return null
                    const isSelected = filterManagerUid === user?.uid
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          setFilterManagerUid(isSelected ? undefined : user?.uid)
                        }
                        title="Prospects enregistrés par le Senior Manager en attente de délégation"
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          border: isSelected
                            ? '1px solid #a855f7'
                            : '1px solid rgba(168, 85, 247, 0.35)',
                          background: isSelected
                            ? '#9333ea'
                            : 'rgba(168, 85, 247, 0.12)',
                          color: isSelected
                            ? '#ffffff'
                            : 'var(--foreground, #f1f5f9)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 150ms ease'
                        }}
                      >
                        <span>📋 Compte Senior</span>
                        <span
                          style={{
                            fontSize: 10.5,
                            padding: '1px 6px',
                            borderRadius: 10,
                            background: isSelected
                              ? 'rgba(255,255,255,0.25)'
                              : 'rgba(168, 85, 247, 0.25)',
                            color: isSelected ? '#ffffff' : '#c084fc',
                            fontWeight: 700
                          }}
                        >
                          {seniorPendingCount}
                        </span>
                      </button>
                    )
                  })()}
                </div>
              </div>
            )}

          {/* Liste consolidée org */}
          <DataCard
            title={t('pipeline.orgPipeline') || 'Pipeline Organisation'}
            subtitle={`${t('pipeline.orgPipelineSubtitle') || 'Tous les prospects de votre organisation'}${filterManagerUid ? (t('pipeline.filteredByManager') || ' — filtré par manager') : ''}`}
          >
            {orgPipelineQuery.isLoading ? <LoadingState /> : null}
            {!orgPipelineQuery.isLoading && (
              <TeamManagerPerformanceCard
                manager={selectedManager}
                managers={orgPipelineQuery.data?.managers}
                items={(orgPipelineQuery.data?.items ?? []) as Parameters<typeof TeamManagerPerformanceCard>[0]['items']}
                onClear={() => setFilterManagerUid(undefined)}
                targets={smTarget}
              />
            )}
            {!orgPipelineQuery.isLoading && !orgPipelineQuery.data?.items?.length ? (
              <EmptyState
                illustration="/illustrations/empty-states/empty-pipeline.png"
                title="Aucun prospect dans l'organisation"
                description={
                  selectedManager
                    ? "Ce Team Manager n'a pas encore de prospects enregistrés."
                    : "Vos Team Managers n'ont pas encore de prospects enregistrés."
                }
              />
            ) : null}
            {orgPipelineQuery.data?.items?.length ? (
              <ManagerPipelineList
                items={
                  orgPipelineQuery.data.items as Parameters<typeof ManagerPipelineList>[0]['items']
                }
                members={members}
                managerUid={user?.uid}
                showTargets={false}
                isOrgView
              />
            ) : null}
          </DataCard>
        </>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════
           Vue TEAM MANAGER — Pipeline de son équipe uniquement
      ═══════════════════════════════════════════════════════════════ */}
      {isTeamManager ? (
        <DataCard title={t('pipeline.teamView')} subtitle={t('pipeline.teamSubtitle')}>
          {managerPipelineQuery.isLoading ? <LoadingState /> : null}
          {!managerPipelineQuery.isLoading && (
            <TeamManagerPerformanceCard
              manager={undefined}
              managers={undefined}
              items={
                (managerPipelineQuery.data ?? []) as Parameters<typeof TeamManagerPerformanceCard>[0]['items']
              }
              targets={tmTarget}
              context="team"
            />
          )}
          {!managerPipelineQuery.isLoading && !managerPipelineQuery.data?.length ? (
            <EmptyState
              illustration="/illustrations/empty-states/empty-pipeline.png"
              title={t('pipeline.noProspect')}
              description={t('pipeline.teamNoProspect')}
            />
          ) : null}
          {managerPipelineQuery.data?.length ? (
            <ManagerPipelineList
              items={managerPipelineQuery.data}
              members={members}
              managerUid={user?.uid}
              enableArchive
            />
          ) : null}
        </DataCard>
      ) : null}

      {/* Vue member/independent */}
      {user?.role === 'member' || user?.role === 'independent' ? (
        <>
          {/* ── Panneau Objectifs (indépendants uniquement) ──────────────── */}
          {isIndependent && !isFree && showTargets && (
            <DataCard
              title="Mes objectifs"
              subtitle="Définis ton objectif de volume (nombre de prospects conclus) et de valeur (CA en FCFA) pour la période choisie."
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {/* Volume */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--muted-foreground)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      Volume (prospects conclus)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="ex : 10"
                      value={tgtVolume}
                      onChange={(e) => setTgtVolume(e.target.value)}
                      style={{
                        height: 36,
                        padding: '0 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>
                  {/* Valeur */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--muted-foreground)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      Valeur cible (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="ex : 500000"
                      value={tgtValue}
                      onChange={(e) => setTgtValue(e.target.value)}
                      style={{
                        height: 36,
                        padding: '0 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>
                  {/* Période */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--muted-foreground)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      Période
                    </label>
                    <input
                      type="text"
                      placeholder="ex : 2026-Q1, 2026-01"
                      value={tgtPeriod}
                      onChange={(e) => setTgtPeriod(e.target.value)}
                      style={{
                        height: 36,
                        padding: '0 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTgtVolume('')
                      setTgtValue('')
                      setTgtPeriod('')
                    }}
                    style={{ fontSize: 12 }}
                  >
                    Réinitialiser
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={saveTarget.isPending}
                    onClick={() => {
                      if (!user?.uid) return
                      saveTarget.mutate({
                        memberId: user.uid,
                        memberName: user.name ?? user.email ?? '',
                        targetVolume: tgtVolume ? Number(tgtVolume) : null,
                        targetValue: tgtValue ? Number(tgtValue) : null,
                        period: tgtPeriod || null
                      })
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                  >
                    {saveTarget.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Target size={13} />
                    )}
                    {saveTarget.isPending ? 'Enregistrement...' : 'Enregistrer les objectifs'}
                  </Button>
                </div>
              </div>
            </DataCard>
          )}
          {/* ── Panneau d'export (indépendants uniquement) ──────────────── */}
          {user?.role === 'independent' && !isFree && showExport && (
            <DataCard
              title="Exporter mon pipeline"
              subtitle="Télécharge un fichier Excel (.xlsx) avec ta synthèse et le détail de tes prospects."
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--muted-foreground)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      Du
                    </label>
                    <input
                      type="date"
                      value={exportFrom}
                      onChange={(e) => setExportFrom(e.target.value)}
                      style={{
                        height: 36,
                        padding: '0 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--muted-foreground)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      Au
                    </label>
                    <input
                      type="date"
                      value={exportTo}
                      onChange={(e) => setExportTo(e.target.value)}
                      style={{
                        height: 36,
                        padding: '0 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExportFrom('')
                      setExportTo('')
                    }}
                    style={{ fontSize: 12 }}
                  >
                    Réinitialiser
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      void exportPerformance({
                        from: exportFrom || undefined,
                        to: exportTo || undefined
                      })
                    }
                    disabled={exportLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                  >
                    {exportLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <FileDown size={13} />
                    )}
                    {exportLoading ? 'Génération...' : 'Télécharger le rapport'}
                  </Button>
                </div>
              </div>
            </DataCard>
          )}

          {showForm ? (
            <DataCard
              title={t('pipeline.addProspectTitle')}
              subtitle={t('pipeline.addProspectSubtitle')}
            >
              <CreatePipelineItemForm onSuccess={() => setShowForm(false)} />
            </DataCard>
          ) : null}

          <DataCard
            title={t('pipeline.myPipeline')}
            subtitle={
              activeStage
                ? `${t('search.filterByStage')} ${
                    activeStage === 'prospection'
                      ? t('pipeline.prospection')
                      : activeStage === 'negociation'
                        ? t('pipeline.negotiation')
                        : t('pipeline.closed')
                  } (${filteredItems.length})`
                : undefined
            }
            actions={
              activeStage ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/pipeline')}
                  style={{ fontSize: 12, height: 30, padding: '0 10px' }}
                >
                  ✕ {t('search.clearStageFilter')}
                </Button>
              ) : undefined
            }
          >
            {userPipelineQuery.isLoading ? <LoadingState /> : null}
            {!userPipelineQuery.isLoading && items.length === 0 ? (
              <EmptyState
                illustration="/illustrations/empty-states/empty-pipeline.png"
                title={t('pipeline.emptyPipeline')}
                description={t('pipeline.emptyPipelineDesc')}
                action={{
                  label: t('pipeline.addProspectTitle') || 'Ajouter une opportunité',
                  onClick: () => setShowForm(true),
                  variant: 'primary'
                }}
              />
            ) : null}
            {!userPipelineQuery.isLoading && items.length > 0 && filteredItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                <p style={{ color: 'var(--muted-foreground)', marginBottom: 12, fontSize: 14 }}>
                  {t('search.noProspectInStage')}
                </p>
                <Button variant="outline" size="sm" onClick={() => router.push('/pipeline')}>
                  {t('search.showAllProspects')}
                </Button>
              </div>
            ) : null}
            {filteredItems.length > 0 ? (
              <UserPipelineList items={filteredItems} onStatusChange={handleStatusChange} />
            ) : null}
          </DataCard>
        </>
      ) : null}
    </AppShell>
  )
}
