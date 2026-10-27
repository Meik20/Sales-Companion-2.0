'use client'

import { useState, useEffect } from 'react'
import { DataCard, ConfirmDialog } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/feedback'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'
import { OrgManagersSection } from './OrgManagersSection'
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Building2,
  ArrowRightLeft,
  AlertCircle,
  Users2,
  Crown,
  Link2,
  Tag,
  Search,
  CheckSquare,
  Square,
  MapPin,
  Phone,
  Briefcase,
  Calendar,
  Filter,
  RefreshCw,
  Clock
} from 'lucide-react'

interface SeniorProspect {
  id: string
  companyName: string
  companySector?: string | null
  companyCity?: string | null
  companyPhone?: string | null
  status: string
  amount: number
  assignedTo?: string | null
  createdAt?: string | null
}

interface OrgManagerItem {
  uid: string
  name: string
  email: string
  phone?: string | null
  orgRole: string
  segment?: string | null
  seniorManagerUid?: string | null
  isCurrent: boolean
  isSenior: boolean
  createdAt?: string | null
}

interface OrgData {
  orgCode: string
  orgRole: 'senior_manager' | 'team_manager'
  isSeniorManager: boolean
  segment?: string | null
  seniorManagerUid?: string | null
  niu: string | null
  isVerified: boolean
  companyName: string
  sector?: string | null
  managers?: OrgManagerItem[]
}

export function OrgGovernanceTab() {
  const { user } = useCurrentUser()
  const { pushToast } = useToast()
  const { t, lang } = useTranslation()

  const [orgData, setOrgData] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)

  // NIU form
  const [niuInput, setNiuInput] = useState('')
  const [niuLoading, setNiuLoading] = useState(false)
  const [niuError, setNiuError] = useState<string | null>(null)
  const [niuSuccess, setNiuSuccess] = useState<string | null>(null)

  // Segment commercial
  const [segmentInput, setSegmentInput] = useState('')
  const [editingSegment, setEditingSegment] = useState(false)
  const [segmentSaving, setSegmentSaving] = useState(false)

  // Copy code & invite
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedTmInvite, setCopiedTmInvite] = useState(false)
  const [copiedSmInvite, setCopiedSmInvite] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState<'tm' | 'sm' | null>(null)

  // Prospect selection & transfer tool
  const [seniorProspects, setSeniorProspects] = useState<SeniorProspect[]>([])
  const [loadingProspects, setLoadingProspects] = useState(false)
  const [selectedProspectIds, setSelectedProspectIds] = useState<string[]>([])
  const [prospectSearch, setProspectSearch] = useState('')
  const [prospectStatusFilter, setProspectStatusFilter] = useState<
    'all' | 'prospection' | 'negociation' | 'conclue'
  >('all')

  const [selectedTargetUid, setSelectedTargetUid] = useState<string>('')
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<string | null>(null)
  const [migrationError, setMigrationError] = useState<string | null>(null)
  const [pendingTransferConfirm, setPendingTransferConfirm] = useState<{
    count: number
    targetName: string
    confirmMsg: string
  } | null>(null)

  // Dateline / Échéance accordée au Team Manager
  const [deadlineOption, setDeadlineOption] = useState<'none' | '24h' | '48h' | '7d' | 'custom'>('48h')
  const [customDeadlineDate, setCustomDeadlineDate] = useState<string>('')

  const getCalculatedDeadlineIso = (): string | null => {
    const now = new Date()
    if (deadlineOption === '24h') {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }
    if (deadlineOption === '48h') {
      return new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
    }
    if (deadlineOption === '7d') {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
    if (deadlineOption === 'custom' && customDeadlineDate) {
      return new Date(customDeadlineDate).toISOString()
    }
    return null
  }

  const isSeniorManager = user?.orgRole === 'senior_manager'

  const fetchSeniorProspects = async () => {
    if (!user || user.orgRole !== 'senior_manager') return
    setLoadingProspects(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/team/migrate-senior-members', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data && Array.isArray(data.prospects)) {
        setSeniorProspects(data.prospects)
      }
    } catch {
      // Ignorer
    } finally {
      setLoadingProspects(false)
    }
  }

  const [refreshing, setRefreshing] = useState(false)

  const fetchOrg = async (forceRefresh = false) => {
    if (!user) return
    if (forceRefresh) setRefreshing(true)
    try {
      // forceRefresh=true pour obtenir un token frais et éviter les problèmes de cache Auth
      const token = await user.getIdToken(true)
      if (!token) return
      const res = await fetch('/api/team/org', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data && !data.error) {
        setOrgData(data)
        if (data.niu) setNiuInput(data.niu)
        if (data.segment) setSegmentInput(data.segment)
        else if (user?.segment) setSegmentInput(user.segment)
        // Débogage : si l'API signale une erreur de chargement des managers, logger en console
        if (data._managersLoadError) {
          console.error(
            '[OrgGovernanceTab] Erreur charg. managers (vérifier index Firestore):',
            data._managersLoadError
          )
        }
      }
    } catch {
      // Ignorer
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchOrg(true)
  }, [user])

  useEffect(() => {
    if (isSeniorManager) {
      void fetchSeniorProspects()
    }
  }, [user, isSeniorManager])

  const copyOrgCode = async () => {
    const code = orgData?.orgCode || user?.orgCode
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
    pushToast({ type: 'success', title: t('team.orgGovernance.orgCodeCopiedToast') })
  }

  const generateAndCopyTmInvite = async () => {
    setGeneratingInvite('tm')
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/team/org/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'team_manager' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur génération lien')
      await navigator.clipboard.writeText(data.inviteUrl)
      setCopiedTmInvite(true)
      setTimeout(() => setCopiedTmInvite(false), 2500)
      pushToast({
        type: 'success',
        title: t('team.orgGovernance.tmInviteSuccessTitle'),
        description: t('team.orgGovernance.tmInviteSuccessDesc').replace('{segment}', data.segment || t('team.orgGovernance.segmentDefault'))
      })
    } catch (err: any) {
      pushToast({
        type: 'error',
        title: t('team.orgGovernance.inviteErrorTitle'),
        description: err.message || t('team.orgGovernance.inviteErrorFallback')
      })
    } finally {
      setGeneratingInvite(null)
    }
  }

  const generateAndCopySmInvite = async () => {
    setGeneratingInvite('sm')
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/team/org/invite-sm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur génération lien Senior Manager')
      await navigator.clipboard.writeText(data.inviteUrl)
      setCopiedSmInvite(true)
      setTimeout(() => setCopiedSmInvite(false), 2500)
      pushToast({
        type: 'success',
        title: t('team.orgGovernance.smInviteSuccessTitle'),
        description: t('team.orgGovernance.smInviteSuccessDesc')
      })
    } catch (err: any) {
      pushToast({
        type: 'error',
        title: t('team.orgGovernance.inviteErrorTitle'),
        description: err.message || t('team.orgGovernance.inviteErrorFallback')
      })
    } finally {
      setGeneratingInvite(null)
    }
  }

  const handleUpdateSegment = async () => {
    if (!segmentInput.trim()) return
    setSegmentSaving(true)
    try {
      const token = await user?.getIdToken()

      // Route dédiée au renommage profond : propage le nouveau nom de segment
      // aux TMs, commerciaux, et fiches pipeline du segment (AGENTS.md §5 renommage)
      const res = await fetch('/api/team/org/segment/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newSegment: segmentInput.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Erreur lors de la mise à jour')

      // Mettre à jour localement le segment affiché
      setOrgData((prev: any) => prev ? { ...prev, segment: data.segment ?? segmentInput.trim() } : prev)
      setEditingSegment(false)

      const usersUpdated = data.updatedCount?.users ?? 0
      const pipelineUpdated = data.updatedCount?.pipeline ?? 0
      const detail =
        usersUpdated > 0 || pipelineUpdated > 0
          ? ` (${usersUpdated} utilisateur${usersUpdated > 1 ? 's' : ''}, ${pipelineUpdated} fiche${pipelineUpdated > 1 ? 's' : ''} mis à jour)`
          : ''

      pushToast({
        type: 'success',
        title: t('team.orgGovernance.segmentUpdateSuccess'),
        description: detail || undefined
      })
    } catch (err: any) {
      pushToast({ type: 'error', title: err.message || t('team.orgGovernance.niuUpdateError') })
    } finally {
      setSegmentSaving(false)
    }
  }

  const handleUpdateNiu = async (e: React.FormEvent) => {
    e.preventDefault()
    setNiuLoading(true)
    setNiuError(null)
    setNiuSuccess(null)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/team/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ niu: niuInput.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour')
      setOrgData(data)
      setNiuSuccess(t('team.orgGovernance.niuSuccessMessage'))
      pushToast({ type: 'success', title: t('team.orgGovernance.niuSuccessToast') })
    } catch (err: any) {
      setNiuError(err.message)
    } finally {
      setNiuLoading(false)
    }
  }

  // Filtrage des prospects
  const filteredProspects = seniorProspects.filter((p) => {
    const q = prospectSearch.toLowerCase().trim()
    const matchesSearch =
      !q ||
      p.companyName.toLowerCase().includes(q) ||
      (p.companyCity && p.companyCity.toLowerCase().includes(q)) ||
      (p.companySector && p.companySector.toLowerCase().includes(q))
    const matchesStatus = prospectStatusFilter === 'all' || p.status === prospectStatusFilter
    return matchesSearch && matchesStatus
  })

  const allFilteredSelected =
    filteredProspects.length > 0 &&
    filteredProspects.every((p) => selectedProspectIds.includes(p.id))

  const toggleSelectProspect = (id: string) => {
    setSelectedProspectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredProspects.map((p) => p.id))
      setSelectedProspectIds((prev) => prev.filter((id) => !filteredIds.has(id)))
    } else {
      const newSelected = new Set(selectedProspectIds)
      filteredProspects.forEach((p) => newSelected.add(p.id))
      setSelectedProspectIds(Array.from(newSelected))
    }
  }

  const handleTransfer = async () => {
    if (!selectedTargetUid) {
      pushToast({
        type: 'warning',
        title: t('team.orgGovernance.noManagerWarningTitle'),
        description: t('team.orgGovernance.noManagerWarningDesc')
      })
      return
    }

    const count = selectedProspectIds.length
    if (count === 0) {
      pushToast({
        type: 'warning',
        title: t('team.orgGovernance.noProspectWarningTitle'),
        description: t('team.orgGovernance.noProspectWarningDesc')
      })
      return
    }

    const targetMgr = orgData?.managers?.find((m) => m.uid === selectedTargetUid)
    const targetName =
      targetMgr?.name || targetMgr?.email || (lang === 'en' ? 'Team Manager' : 'Team Manager')
    const confirmMsg = t('team.orgGovernance.transferConfirm')
      .replace('{count}', String(count))
      .replace('{plural}', count > 1 ? 's' : '')
      .replace('{name}', targetName)
    setPendingTransferConfirm({ count, targetName, confirmMsg })
  }

  async function executeTransfer() {
    const count = selectedProspectIds.length
    const targetMgr = orgData?.managers?.find((m) => m.uid === selectedTargetUid)
    const targetName =
      targetMgr?.name || targetMgr?.email || (lang === 'en' ? 'Team Manager' : 'Team Manager')
    setMigrating(true)
    setMigrationError(null)
    setMigrationResult(null)
    try {
      const token = await user?.getIdToken()
      const deadlineIso = getCalculatedDeadlineIso()
      const res = await fetch('/api/team/migrate-senior-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          targetManagerUid: selectedTargetUid,
          prospectIds: selectedProspectIds,
          deadline: deadlineIso
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors du transfert')

      const { migratedCount, targetManager } = data
      const summary = t('team.orgGovernance.transferSuccessDesc')
        .replace('{count}', String(migratedCount.pipeline))
        .replace('{name}', targetManager.name)
      setMigrationResult(summary)
      setSelectedProspectIds([])
      pushToast({
        type: 'success',
        title: t('team.orgGovernance.transferSuccessTitle'),
        description: t('team.orgGovernance.transferSuccessDesc')
          .replace('{count}', String(count))
          .replace('{name}', targetManager.name)
      })
      void fetchOrg()
      void fetchSeniorProspects()
    } catch (err: any) {
      setMigrationError(err.message)
    } finally {
      setMigrating(false)
    }
  }

  // Filtrer les Team Managers (exclure le Senior)
  const teamManagers = (orgData?.managers || []).filter((m) => !m.isSenior)

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>
        {t('team.orgGovernance.loadingOrg')}
      </div>
    )
  }

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── 1. Carte Identité & Gouvernance ────────────────────────── */}
      <DataCard
        title={t('team.orgGovernance.cardTitle')}
        actions={
          <InfoTooltip
            placement="left"
            content={t('team.orgGovernance.cardTooltip')}
          />
        }
      >
        <div className="flex flex-col gap-6">
          {/* Entreprise & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('team.orgGovernance.companyLabel')}
              </span>
              <h4 className="mt-1 text-[17px] font-bold text-foreground flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                {orgData?.companyName || user?.companyName || user?.company || t('team.orgGovernance.defaultOrgName')}
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 dark:border-violet-500/30 bg-violet-100 dark:bg-violet-500/15 px-3 py-1 text-[12px] font-bold text-violet-800 dark:text-violet-300 shadow-xs">
                <Crown size={12} className="text-violet-700 dark:text-violet-400" />
                Senior Manager
              </span>
              {orgData?.isVerified || Boolean(user?.niu) ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 dark:border-emerald-500/30 bg-emerald-100 dark:bg-emerald-500/15 px-3 py-1 text-[12px] font-bold text-emerald-800 dark:text-emerald-300 shadow-xs">
                  <ShieldCheck size={14} className="text-emerald-700 dark:text-emerald-400" />
                  {t('team.orgGovernance.verifiedBadge')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-500/30 bg-amber-100 dark:bg-amber-500/15 px-3 py-1 text-[12px] font-bold text-amber-900 dark:text-amber-300 shadow-xs">
                  <ShieldAlert size={14} className="text-amber-700 dark:text-amber-400" />
                  {t('team.orgGovernance.standardBadge')}
                </span>
              )}
            </div>
          </div>

          {/* Segment Commercial Actuel & Édition */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Tag size={13} className="text-primary shrink-0" /> {t('team.orgGovernance.segmentLabel')}
                </div>
                {!editingSegment ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[16px] font-bold text-foreground">
                      {orgData?.segment || user?.segment || t('team.orgGovernance.segmentDefault')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSegmentInput(orgData?.segment || user?.segment || '')
                        setEditingSegment(true)
                      }}
                      className="ml-2 text-[12px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      {t('team.orgGovernance.editSegment')}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={segmentInput}
                      onChange={(e) => setSegmentInput(e.target.value)}
                      placeholder={t('team.orgGovernance.segmentPlaceholder')}
                      className="h-8 rounded-lg border border-border bg-card px-2.5 text-[13px] text-foreground focus:border-primary focus:outline-none"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      loading={segmentSaving}
                      onClick={() => void handleUpdateSegment()}
                    >
                      {t('team.orgGovernance.saveSegment')}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setEditingSegment(false)}
                      className="text-[12px] text-muted-foreground hover:text-foreground cursor-pointer px-2"
                    >
                      {t('team.orgGovernance.cancelSegment')}
                    </button>
                  </div>
                )}
              </div>
              <InfoTooltip
                placement="left"
                content={t('team.orgGovernance.segmentTooltip')}
              />
            </div>
          </div>

          {/* Code Organisation unique + Actions d'invitation */}
          <div className="rounded-xl border border-border bg-secondary/30 p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                  <span>{t('team.orgGovernance.orgCodeLabel')}</span>
                  <InfoTooltip
                    placement="top"
                    content={t('team.orgGovernance.orgCodeTooltip')}
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <code className="rounded-md bg-primary/10 px-3 py-1 font-mono text-[16px] font-extrabold text-primary">
                    {orgData?.orgCode || user?.orgCode || t('team.orgGovernance.orgCodeLoading')}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyOrgCode()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1 text-[12px] font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    {copiedCode ? (
                      <Check size={13} className="text-green-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                    {copiedCode ? t('team.orgGovernance.codeCopied') : t('team.orgGovernance.copyCode')}
                  </button>
                </div>
              </div>
            </div>

            {/* Deux boutons d'invitations distincts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* 1. Inviter un Team Manager dans mon segment */}
              <div className="flex flex-col justify-between rounded-xl border border-border bg-card/60 p-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[13.5px] text-foreground flex items-center gap-2">
                      <Users2 size={16} className="text-primary shrink-0" />
                      <span>{t('team.orgGovernance.tmInviteTitle')}</span>
                    </span>
                    <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-md">
                      {t('team.orgGovernance.tmSegmentBadge').replace('{segment}', orgData?.segment || user?.segment || t('team.orgGovernance.segmentDefault'))}
                    </span>
                  </div>
                  <InfoTooltip
                    placement="top"
                    content={t('team.orgGovernance.tmInviteTooltip')}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void generateAndCopyTmInvite()}
                  disabled={generatingInvite === 'tm'}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 dark:bg-primary/20 px-3 py-2 text-[12.5px] font-bold text-primary transition-colors hover:bg-primary/20 dark:hover:bg-primary/30 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {copiedTmInvite ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Link2 size={14} className="shrink-0" />}
                  {copiedTmInvite ? t('team.orgGovernance.tmLinkCopied') : generatingInvite === 'tm' ? t('team.orgGovernance.generating') : t('team.orgGovernance.copyTmLink')}
                </button>
              </div>

              {/* 2. Inviter un Senior Manager pour un nouveau segment */}
              <div className="flex flex-col justify-between rounded-xl border border-border bg-card/60 p-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[13.5px] text-foreground flex items-center gap-2">
                      <Crown size={16} className="text-violet-600 dark:text-violet-400 shrink-0" />
                      <span>{t('team.orgGovernance.smInviteTitle')}</span>
                    </span>
                    <span className="text-[11px] font-bold text-violet-800 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/20 border border-violet-300 dark:border-violet-500/30 px-2 py-0.5 rounded-md">
                      {t('team.orgGovernance.smNewSegmentBadge')}
                    </span>
                  </div>
                  <InfoTooltip
                    placement="top"
                    content={t('team.orgGovernance.smInviteTooltip')}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void generateAndCopySmInvite()}
                  disabled={generatingInvite === 'sm'}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-violet-400 dark:border-violet-500/50 bg-violet-100 dark:bg-violet-500/20 px-3 py-2 text-[12.5px] font-bold text-violet-800 dark:text-violet-200 transition-colors hover:bg-violet-200 dark:hover:bg-violet-500/30 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {copiedSmInvite ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Link2 size={14} className="shrink-0" />}
                  {copiedSmInvite ? t('team.orgGovernance.smLinkCopied') : generatingInvite === 'sm' ? t('team.orgGovernance.generating') : t('team.orgGovernance.copySmLink')}
                </button>
              </div>
            </div>
          </div>

          {/* NIU Fiscal Section */}
          <div className="flex flex-col gap-3 border-t border-border pt-6">
            <h4 className="m-0 text-[14px] font-bold text-foreground flex items-center gap-1.5">
              {t('team.orgGovernance.niuTitle')}
              <InfoTooltip
                placement="right"
                content={t('team.orgGovernance.niuTooltip')}
              />
            </h4>

            <form onSubmit={handleUpdateNiu} className="flex max-w-[440px] flex-col gap-2.5">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Ex: M051212345678A"
                  value={niuInput}
                  onChange={(e) => setNiuInput(e.target.value.toUpperCase())}
                />
                <Button
                  type="submit"
                  variant="primary"
                  loading={niuLoading}
                  style={{ flexShrink: 0 }}
                >
                  {t('team.orgGovernance.niuSave')}
                </Button>
              </div>
              {niuError && <div className="text-[12px] text-red-600 dark:text-red-400 font-semibold">{niuError}</div>}
              {niuSuccess && <div className="text-[12px] text-emerald-700 dark:text-emerald-400 font-bold">{niuSuccess}</div>}
            </form>
          </div>
        </div>
      </DataCard>

      {/* ── 2. Outil de Sélection & Transfert de Prospects vers un Team Manager ── */}
      {isSeniorManager && (
        <DataCard
          title={t('team.orgGovernance.transferCardTitle')}
          subtitle={t('team.orgGovernance.transferCardSubtitle')}
          actions={
            <InfoTooltip
              placement="left"
              content={
                <>
                  <strong className="block mb-1">{t('team.orgGovernance.transferTooltipTitle')}</strong>
                  {t('team.orgGovernance.transferTooltipDesc')}
                </>
              }
            />
          }
        >
          <div className="flex flex-col gap-5">

            {/* Outils de filtre & recherche */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h5 className="m-0 text-[14px] font-bold text-foreground flex items-center gap-2">
                    <Briefcase size={16} className="text-primary" />
                    {t('team.orgGovernance.seniorProspectsTitle').replace('{count}', String(seniorProspects.length))}
                  </h5>
                  {selectedProspectIds.length > 0 && (
                    <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[11.5px] font-bold text-primary">
                      {t('team.orgGovernance.selectedCount')
                        .replace('{count}', String(selectedProspectIds.length))
                        .replace('{plural}', selectedProspectIds.length > 1 ? 's' : '')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchSeniorProspects()}
                    disabled={loadingProspects}
                    title={t('team.orgGovernance.refreshBtn')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[12px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <RefreshCw size={12} className={loadingProspects ? 'animate-spin' : ''} />
                    {t('team.orgGovernance.refreshBtn')}
                  </button>

                  {filteredProspects.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                    >
                      {allFilteredSelected ? <Square size={13} /> : <CheckSquare size={13} />}
                      {allFilteredSelected ? t('team.orgGovernance.deselectAllBtn') : t('team.orgGovernance.selectAllBtn')}
                    </button>
                  )}
                </div>
              </div>

              {/* Barre de recherche et filtres de statut */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder={t('team.orgGovernance.filterPlaceholder')}
                    value={prospectSearch}
                    onChange={(e) => setProspectSearch(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Filtres par statut */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/30 p-0.5 text-[12px]">
                  {(['all', 'prospection', 'negociation', 'conclue'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setProspectStatusFilter(st)}
                      className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                        prospectStatusFilter === st
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {st === 'all'
                        ? t('team.orgGovernance.statusAll')
                        : st === 'prospection'
                          ? t('team.orgGovernance.statusProspection')
                          : st === 'negociation'
                            ? t('team.orgGovernance.statusNegociation')
                            : t('team.orgGovernance.statusConclue')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table / Liste des prospects sélectionnables */}
              <div className="mt-2 max-h-[360px] overflow-y-auto rounded-lg border border-border bg-background/50">
                {loadingProspects ? (
                  <div className="p-8 text-center text-[13px] text-muted-foreground">
                    {t('team.orgGovernance.loadingProspects')}
                  </div>
                ) : filteredProspects.length === 0 ? (
                  <div className="py-6">
                    <EmptyState
                      illustration="/illustrations/empty-states/empty-prospects.png"
                      illustrationSize="sm"
                      title={
                        seniorProspects.length === 0
                          ? t('team.orgGovernance.noProspectsTitle')
                          : t('team.orgGovernance.noResultsTitle')
                      }
                      description={
                        seniorProspects.length === 0
                          ? t('team.orgGovernance.noProspectsDesc')
                          : t('team.orgGovernance.noResultsDesc')
                      }
                    />
                  </div>
                ) : (
                  <table className="w-full text-left text-[12.5px] border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 pl-3 pr-2 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={toggleSelectAll}
                            className="cursor-pointer accent-primary"
                            aria-label={t('team.orgGovernance.selectAllAriaLabel')}
                          />
                        </th>
                        <th className="py-2.5 px-3">{t('team.orgGovernance.colCompany')}</th>
                        <th className="py-2.5 px-3">{t('team.orgGovernance.colCityAndSector')}</th>
                        <th className="py-2.5 px-3">{t('team.orgGovernance.colPipelineStatus')}</th>
                        <th className="py-2.5 pr-3 text-right">{t('team.orgGovernance.colAddedDate')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProspects.map((p) => {
                        const isSelected = selectedProspectIds.includes(p.id)
                        return (
                          <tr
                            key={p.id}
                            onClick={() => toggleSelectProspect(p.id)}
                            className={`cursor-pointer border-b border-border/50 transition-colors hover:bg-secondary/40 ${
                              isSelected ? 'bg-primary/10' : ''
                            }`}
                          >
                            <td
                              className="py-3 pl-3 pr-2 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectProspect(p.id)}
                                className="cursor-pointer accent-primary"
                                aria-label={t('team.orgGovernance.selectProspectAriaLabel').replace('{name}', p.companyName)}
                              />
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <Building2 size={13} className="text-primary/70 shrink-0" />
                                {p.companyName}
                              </div>
                              {p.companyPhone && (
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Phone size={10} />
                                  {p.companyPhone}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-0.5">
                                {p.companyCity && (
                                  <span className="text-[11.5px] text-foreground/90 flex items-center gap-1">
                                    <MapPin size={11} className="text-muted-foreground" />
                                    {p.companyCity}
                                  </span>
                                )}
                                {p.companySector && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {p.companySector}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                  p.status === 'conclue'
                                    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                                    : p.status === 'negociation'
                                      ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                                      : 'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30'
                                }`}
                              >
                                {p.status === 'conclue'
                                  ? t('team.orgGovernance.statusConclue')
                                  : p.status === 'negociation'
                                    ? t('team.orgGovernance.statusNegociation')
                                    : t('team.orgGovernance.statusProspection')}
                              </span>
                            </td>
                            <td className="py-3 pr-3 text-right text-[11.5px] text-muted-foreground">
                              {p.createdAt
                                ? new Date(p.createdAt).toLocaleDateString(
                                    t('team.orgGovernance.statusAll') === 'All' ? 'en-US' : 'fr-FR'
                                  )
                                : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Barre de sélection du Team Manager et d'action de Transfert */}
            {teamManagers.length > 0 ? (
              <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <label className="text-[13px] font-bold text-foreground block">
                      {t('team.orgGovernance.receiverLabel')}
                    </label>
                    <p className="m-0 text-[11.5px] text-muted-foreground">
                      {t('team.orgGovernance.receiverDesc')}
                    </p>
                  </div>

                  {selectedProspectIds.length > 0 && (
                    <div className="text-[12.5px] font-bold text-primary">
                      {selectedProspectIds.length} prospect
                      {selectedProspectIds.length > 1 ? 's' : ''} sélectionné
                      {selectedProspectIds.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Sélecteur de Délai d'intervention / Dateline */}
                <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-foreground">
                    <Clock size={13} className="text-primary" />
                    <span>Délai d'intervention accordé au Team Manager :</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: '24h', label: '24 heures' },
                      { id: '48h', label: '48 heures (Recommandé)' },
                      { id: '7d', label: '7 jours' },
                      { id: 'custom', label: 'Personnalisé' },
                      { id: 'none', label: 'Sans échéance' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDeadlineOption(opt.id as any)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          deadlineOption === opt.id
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {deadlineOption === 'custom' && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="datetime-local"
                        value={customDeadlineDate}
                        onChange={(e) => setCustomDeadlineDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="h-8 rounded-lg border border-border bg-card px-2.5 text-[11.5px] text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <select
                    value={selectedTargetUid}
                    onChange={(e) => setSelectedTargetUid(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-card px-3 text-[13px] text-foreground focus:border-primary focus:outline-none"
                    style={{ minWidth: 280 }}
                  >
                    <option value="">{t('team.orgGovernance.selectManagerPlaceholder')}</option>
                    {teamManagers.map((mgr) => (
                      <option key={mgr.uid} value={mgr.uid}>
                        {mgr.name} ({mgr.email})
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    variant="primary"
                    loading={migrating}
                    disabled={selectedProspectIds.length === 0 || !selectedTargetUid || migrating}
                    onClick={() => void handleTransfer()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
                  >
                    <ArrowRightLeft size={14} />
                    {selectedProspectIds.length > 0
                      ? t('team.orgGovernance.transferBtnCount')
                          .replace('{count}', String(selectedProspectIds.length))
                          .replace('{plural}', selectedProspectIds.length > 1 ? 's' : '')
                      : t('team.orgGovernance.transferBtn')}
                  </Button>
                </div>

                {migrationResult && (
                  <div className="rounded-lg border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3 text-[13px] text-emerald-800 dark:text-emerald-300 font-semibold">
                    {migrationResult}
                  </div>
                )}
                {migrationError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-400 font-medium">
                    {migrationError}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[13px] text-muted-foreground italic">
                {t('team.orgGovernance.noTeamManagerYet')}
              </div>
            )}
          </div>
        </DataCard>
      )}

      {/* ── 3. Supervision des Team Managers ────────────────────────── */}
      <DataCard
        title={t('team.orgGovernance.orgTeamCardTitle')}
        subtitle={t('team.orgGovernance.orgTeamCardSubtitle')}
        actions={
          <button
            type="button"
            onClick={() => void fetchOrg(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--muted-foreground)',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '4px 10px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1
            }}
          >
            <RefreshCw
              size={12}
              style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
            />
            {refreshing ? t('team.orgGovernance.refreshing') : t('team.orgGovernance.refresh')}
          </button>
        }
      >
        <OrgManagersSection
          managers={(orgData?.managers || []) as any}
          orgCode={orgData?.orgCode || ''}
          onRefresh={() => void fetchOrg(true)}
        />
      </DataCard>
    </div>

      <ConfirmDialog
        isOpen={pendingTransferConfirm !== null}
        variant="warning"
        title={pendingTransferConfirm?.confirmMsg ?? ''}
        description={`${pendingTransferConfirm?.count ?? 0} prospect${(pendingTransferConfirm?.count ?? 0) > 1 ? 's seront transférés' : ' sera transféré'} à ${pendingTransferConfirm?.targetName ?? ''}.`}
        confirmText={t('team.orgGovernance.transferBtn') || 'Transférer'}
        isLoading={migrating}
        onConfirm={async () => {
          setPendingTransferConfirm(null)
          await executeTransfer()
        }}
        onCancel={() => setPendingTransferConfirm(null)}
      />
    </>
  )
}
