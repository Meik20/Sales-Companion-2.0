'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { DataCard, ConfirmDialog } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/feedback'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'
import { DEPLOYMENT_CONFIG } from '@/lib/deployment-config'
import { getRoleDisplayLabel } from '@/lib/role-labels'
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
  Clock,
  ChevronDown
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

interface OrgExecutiveItem {
  uid: string
  name: string
  email: string
  customRoleLabel?: string | null
  segment?: string | null
  segments?: string[]
}

interface OrgCoordinatorItem {
  uid: string
  name: string
  email: string
  phone?: string | null
  orgRole: string
  segment?: string | null
  zone?: string | null
  displaySegment?: string | null
  isPrimary?: boolean
  isCurrent?: boolean
  createdAt?: string | null
}

interface OrgData {
  orgCode: string
  orgRole: 'senior_manager' | 'team_manager'
  isSeniorManager: boolean
  isPrimarySeniorManager?: boolean
  primarySeniorManagerUid?: string | null
  segment?: string | null
  seniorManagerUid?: string | null
  niu: string | null
  isVerified: boolean
  companyName: string
  sector?: string | null
  managers?: OrgManagerItem[]
  executives?: OrgExecutiveItem[]
  coordinators?: OrgCoordinatorItem[]
  availableSegments?: string[]
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
  const [copiedExecutiveInvite, setCopiedExecutiveInvite] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState<'tm' | 'sm' | 'executive' | null>(null)
  // Libellé personnalisé du rôle executive saisi par le SM1 (ex: "Directeur Général", "Président")
  const [executiveCustomLabel, setExecutiveCustomLabel] = useState('')
  // Segment personnalisé pour le nouveau Coordinateur
  const [smSegmentInput, setSmSegmentInput] = useState('')
  // Zone géographique obligatoire pour le nouveau Coordinateur
  const [smZoneInput, setSmZoneInput] = useState('')
  // Multi-sélection des segments pour le Responsable Exécutif (défaut sur Supervision Globale)
  const [isExecutiveAllSegments, setIsExecutiveAllSegments] = useState(true)
  const [selectedExecutiveSegments, setSelectedExecutiveSegments] = useState<string[]>([])
  const [executiveSegmentsDropdownOpen, setExecutiveSegmentsDropdownOpen] = useState(false)
  const executiveSegmentsDropdownRef = useRef<HTMLDivElement>(null)

  // Gestion popover Coordinateur sélectionné (SM1 uniquement)
  const [coordinatorDropdownOpen, setCoordinatorDropdownOpen] = useState(false)
  const [selectedCoordinator, setSelectedCoordinator] = useState<OrgCoordinatorItem | null>(null)
  const [coordNewSegment, setCoordNewSegment] = useState('')
  const [coordNewZone, setCoordNewZone] = useState('')
  const [savingCoordinator, setSavingCoordinator] = useState(false)
  const coordinatorDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        executiveSegmentsDropdownRef.current &&
        !executiveSegmentsDropdownRef.current.contains(event.target as Node)
      ) {
        setExecutiveSegmentsDropdownOpen(false)
      }
      if (
        coordinatorDropdownRef.current &&
        !coordinatorDropdownRef.current.contains(event.target as Node)
      ) {
        setCoordinatorDropdownOpen(false)
      }
    }
    if (executiveSegmentsDropdownOpen || coordinatorDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [executiveSegmentsDropdownOpen, coordinatorDropdownOpen])

  const executiveSegmentsButtonLabel = useMemo(() => {
    if (isExecutiveAllSegments) {
      return lang === 'en'
        ? 'All segments (Global Oversight)'
        : 'Tous les segments (Supervision Globale)'
    }
    if (selectedExecutiveSegments.length === 0) {
      return lang === 'en' ? 'Select segments…' : 'Sélectionner les segments…'
    }
    if (selectedExecutiveSegments.length === 1) {
      return `Segment : ${selectedExecutiveSegments[0]}`
    }
    return `${selectedExecutiveSegments.length} ${lang === 'en' ? 'segments selected' : 'segments sélectionnés'}`
  }, [isExecutiveAllSegments, selectedExecutiveSegments, lang])

  // Segments de marché existants dans l'organisation (pour sélection rapide ou réutilisation)
  const existingOrgSegments = useMemo(() => {
    const set = new Set<string>()
    const cur = orgData?.segment || user?.segment
    if (cur?.trim()) {
      const base = cur.split('(')[0]?.trim().toUpperCase()
      if (base) set.add(base)
    }
    ;(orgData?.managers || []).forEach((m) => {
      if (m.isSenior && m.segment?.trim()) {
        const base = m.segment.split('(')[0]?.trim().toUpperCase()
        if (base) set.add(base)
      }
    })
    return Array.from(set)
  }, [orgData?.segment, orgData?.managers, user?.segment])

  // Liste dynamique des segments des Coordinateurs existants dans l'organisation (dédupliquée par segment de base)
  const coordinatorSegments = useMemo(() => {
    const grouped = new Map<string, { segment: string; names: string[]; isCurrent: boolean }>()

    const addEntry = (rawSeg: string | null | undefined, zone: string | null | undefined, name: string, isCurrent: boolean) => {
      if (!rawSeg?.trim()) return
      const clean = rawSeg.trim()
      const base = clean.split('(')[0]?.trim().toUpperCase() || clean.toUpperCase()
      const zoneSuffix = zone?.trim() ? ` (${zone.trim()})` : ''
      const label = `${name}${zoneSuffix}`
      const existing = grouped.get(base)
      if (!existing) {
        grouped.set(base, { segment: base, names: [label], isCurrent })
      } else {
        if (!existing.names.includes(label)) {
          existing.names.push(label)
        }
        if (isCurrent) existing.isCurrent = true
      }
    }

    // 1. Inclure le segment du Coordinateur connecté
    addEntry(
      orgData?.segment || user?.segment,
      (orgData as any)?.zone || (user as any)?.zone,
      user?.name || user?.email || (lang === 'en' ? 'Me' : 'Moi-même'),
      true
    )

    // 2. Parcourir les autres Coordinateurs éventuels
    ;(orgData?.managers || []).forEach((m) => {
      if (m.isCurrent || !m.isSenior) return
      addEntry(m.segment, (m as any).zone, m.name || m.email, false)
    })

    // 3. Inclure aussi les segments renvoyés par availableSegments (pour SM1 avec étanchéité)
    ;(orgData?.availableSegments || []).forEach((seg) => {
      const clean = seg.trim().toUpperCase()
      if (clean && !grouped.has(clean)) {
        grouped.set(clean, { segment: clean, names: [], isCurrent: false })
      }
    })

    return Array.from(grouped.values()).map((g) => ({
      segment: g.segment,
      coordinatorName: g.names.join(', '),
      isCurrent: g.isCurrent
    }))
  }, [orgData?.segment, (orgData as any)?.zone, orgData?.managers, orgData?.availableSegments, user?.segment, (user as any)?.zone, user?.name, user?.email, lang])

  const [editingExecUid, setEditingExecUid] = useState<string | null>(null)
  const [editingExecAll, setEditingExecAll] = useState<boolean>(true)
  const [editingExecSegments, setEditingExecSegments] = useState<string[]>([])
  const [savingExecSegments, setSavingExecSegments] = useState(false)

  const startEditingExecSegments = (exec: OrgExecutiveItem) => {
    const hasSpecific = Array.isArray(exec.segments) && exec.segments.length > 0
    setEditingExecUid(exec.uid)
    setEditingExecAll(!hasSpecific)
    setEditingExecSegments(hasSpecific ? exec.segments! : [])
  }

  const saveExecSegments = async (execUid: string) => {
    if (!user) return
    setSavingExecSegments(true)
    try {
      const token = await user.getIdToken()
      const payloadSegments = editingExecAll ? 'ALL' : editingExecSegments
      const res = await fetch('/api/team/executives/segments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ executiveUid: execUid, segments: payloadSegments })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setOrgData((prev) =>
        prev
          ? {
              ...prev,
              executives: (prev.executives || []).map((ex) =>
                ex.uid === execUid
                  ? { ...ex, segments: data.segments, segment: data.segment }
                  : ex
              )
            }
          : prev
      )
      setEditingExecUid(null)
      pushToast({
        type: 'success',
        title: lang === 'en' ? 'Observed segments updated' : 'Segments d’observation mis à jour',
        description:
          editingExecAll || editingExecSegments.length === 0
            ? lang === 'en'
              ? 'Executive now has global oversight across all segments.'
              : 'L’Exécutif dispose désormais d’une supervision globale.'
            : `${lang === 'en' ? 'Active segments:' : 'Segments actifs :'} ${editingExecSegments.join(', ')}`
      })
    } catch (err: any) {
      pushToast({
        type: 'error',
        title: lang === 'en' ? 'Update failed' : 'Échec de la mise à jour',
        description: err?.message || 'Erreur inconnue'
      })
    } finally {
      setSavingExecSegments(false)
    }
  }

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
  const isExecutive = user?.orgRole === 'executive'
  const isPrimarySeniorManager =
    orgData?.isPrimarySeniorManager !== undefined
      ? Boolean(orgData.isPrimarySeniorManager)
      : isSeniorManager &&
        (user as any)?.isPrimarySeniorManager !== false &&
        !Boolean((user as any)?.invitedByUid)
  // Seul le Coordinateur principal (SM1) peut modifier les informations de gouvernance.
  // Un Manager exécutif ou un Coordinateur invité est strictement en lecture seule sur ces champs.
  const canEditGovernance = isPrimarySeniorManager && !isExecutive

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

  const generateAndCopyExecutiveInvite = async () => {
    setGeneratingInvite('executive')
    try {
      const token = await user?.getIdToken()
      // RÈGLE ARCHITECTURALE : Si Supervision Globale, segments vaut vide et segment vaut null
      const chosenSegments = isExecutiveAllSegments ? [] : selectedExecutiveSegments
      const chosenSegment = chosenSegments.length === 1 ? chosenSegments[0] : null
      const res = await fetch('/api/team/org/invite-executive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customRoleLabel: executiveCustomLabel.trim() || null,
          segments: chosenSegments,
          segment: chosenSegment
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur génération lien Direction')
      await navigator.clipboard.writeText(data.inviteUrl)
      setCopiedExecutiveInvite(true)
      setTimeout(() => setCopiedExecutiveInvite(false), 2500)
      const labelDisplay = executiveCustomLabel.trim() || 'Direction Générale'
      const scopeDisplay = isExecutiveAllSegments
        ? ' (Supervision Globale – Tous les segments)'
        : chosenSegments.length === 1
          ? ` (Segment : ${chosenSegments[0]})`
          : ` (Segments : ${chosenSegments.join(', ')})`
      pushToast({
        type: 'success',
        title: `Lien ${labelDisplay} généré !`,
        description: `Le lien d'invitation pour ${labelDisplay}${scopeDisplay} a été copié dans le presse-papier.`
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
    const chosenSegment = smSegmentInput.trim().toUpperCase()
    const chosenZone = smZoneInput.trim()
    if (!chosenSegment || !chosenZone) {
      pushToast({
        type: 'error',
        title: lang === 'en' ? 'Missing fields' : 'Champs obligatoires',
        description: lang === 'en'
          ? 'Both market segment and zone are required.'
          : 'Le segment d\'activité et la zone sont obligatoires.'
      })
      return
    }
    setGeneratingInvite('sm')
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/team/org/invite-sm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ segment: chosenSegment, zone: chosenZone })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur génération lien Coordinateur')
      await navigator.clipboard.writeText(data.inviteUrl)
      setCopiedSmInvite(true)
      setTimeout(() => setCopiedSmInvite(false), 2500)
      pushToast({
        type: 'success',
        title: t('team.orgGovernance.smInviteSuccessTitle') || 'Lien Coordinateur copié !',
        description: `${lang === 'en' ? 'Coordinator invite link for' : 'Lien d\'invitation copié pour'} : ${chosenSegment} (${chosenZone})`
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

  const handleUpdateCoordinatorSegment = async () => {
    if (!selectedCoordinator || !coordNewSegment.trim()) return
    setSavingCoordinator(true)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/team/org/coordinator/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          coordinatorUid: selectedCoordinator.uid,
          newSegment: coordNewSegment.trim(),
          newZone: coordNewZone.trim()
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Erreur lors de la mise à jour')

      // Mettre à jour orgData localement
      setOrgData((prev: any) => {
        if (!prev) return prev
        const updatedCoordinators = (prev.coordinators || []).map((c: OrgCoordinatorItem) => {
          if (c.uid === selectedCoordinator.uid) {
            return {
              ...c,
              segment: data.coordinator?.segment || coordNewSegment.trim().toUpperCase(),
              zone: data.coordinator?.zone || coordNewZone.trim(),
              displaySegment: data.coordinator?.displaySegment
            }
          }
          return c
        })
        const nextState: any = { ...prev, coordinators: updatedCoordinators }
        if (selectedCoordinator.uid === user?.uid) {
          nextState.segment = data.coordinator?.segment || coordNewSegment.trim().toUpperCase()
        }
        return nextState
      })

      pushToast({
        type: 'success',
        title: lang === 'en' ? 'Coordinator profile updated' : 'Profil Coordinateur mis à jour',
        description: data.message
      })
      setSelectedCoordinator(null)
    } catch (err: any) {
      pushToast({
        type: 'error',
        title: err.message || (lang === 'en' ? 'Update failed' : 'Échec de la mise à jour')
      })
    } finally {
      setSavingCoordinator(false)
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
      targetMgr?.name || targetMgr?.email || (lang === 'en' ? 'Supervisor' : 'Superviseur')
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
      targetMgr?.name || targetMgr?.email || (lang === 'en' ? 'Supervisor' : 'Superviseur')
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
          subtitle={t('team.orgGovernance.cardTooltip')}
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
                  {getRoleDisplayLabel({
                    role: user?.role || 'manager',
                    orgRole: user?.orgRole || 'senior_manager',
                    lang,
                    customRoleLabel: user?.customRoleLabel
                  })}
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
                  {!editingSegment || !canEditGovernance ? (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[16px] font-bold text-foreground">
                        {orgData?.segment || user?.segment || t('team.orgGovernance.segmentDefault')}
                      </span>
                      {canEditGovernance && (
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
                      )}
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

                {/* Sélecteur de gestion des Coordinateurs (SM1 uniquement) */}
                {isPrimarySeniorManager && (orgData?.coordinators || []).length > 0 && (
                  <div className="relative" ref={coordinatorDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setCoordinatorDropdownOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-lg border border-violet-400/50 bg-violet-50 dark:bg-violet-950/30 px-3 py-1.5 text-[12px] font-bold text-violet-800 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 cursor-pointer shadow-xs transition-colors"
                    >
                      <Crown size={14} className="text-violet-600 dark:text-violet-400" />
                      <span>
                        {lang === 'en'
                          ? `Manage Coordinators (${orgData?.coordinators?.length})`
                          : `Gérer les Coordinateurs (${orgData?.coordinators?.length})`}
                      </span>
                      <ChevronDown size={13} className="opacity-70" />
                    </button>

                    {/* Menu déroulant des Coordinateurs (100% opaque) */}
                    {coordinatorDropdownOpen && (
                      <div className="dropdown-menu absolute right-0 z-30 mt-2 w-72 rounded-xl border border-border bg-card p-2 shadow-elevation-3">
                        <div className="px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
                          {lang === 'en' ? 'Active Coordinators' : 'Coordinateurs actifs'}
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {(orgData?.coordinators || []).map((coord) => (
                            <button
                              key={coord.uid}
                              type="button"
                              onClick={() => {
                                setSelectedCoordinator(coord)
                                setCoordNewSegment(coord.segment?.split('(')[0]?.trim() || '')
                                setCoordNewZone(coord.zone || '')
                                setCoordinatorDropdownOpen(false)
                              }}
                              className="w-full flex items-center justify-between gap-2 rounded-lg p-2 text-left hover:bg-secondary cursor-pointer transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="text-[12.5px] font-bold text-foreground truncate flex items-center gap-1.5">
                                  <span>{coord.name}</span>
                                  {coord.isPrimary && (
                                    <span className="text-[9.5px] px-1 py-0.2 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 font-extrabold">
                                      SM1
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">{coord.email}</div>
                              </div>
                              <span className="shrink-0 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                                {coord.displaySegment || coord.segment || 'N/D'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <InfoTooltip
                  placement="left"
                  content={t('team.orgGovernance.segmentTooltip')}
                />
              </div>
            </div>

            {/* Carte Popover / Modal de gestion du profil du Coordinateur sélectionné (100% OPAQUE) */}
            {selectedCoordinator && (
              <div className="rounded-xl border-2 border-violet-500/40 bg-card p-5 shadow-elevation-2 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Crown size={16} className="text-violet-600 dark:text-violet-400" />
                    <h5 className="m-0 text-[14px] font-bold text-foreground">
                      {lang === 'en' ? 'Manage Coordinator Profile' : 'Gérer le profil du Coordinateur'} :{' '}
                      <span className="text-violet-600 dark:text-violet-400">{selectedCoordinator.name}</span>
                    </h5>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCoordinator(null)}
                    className="text-[12px] font-bold text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1 rounded-md hover:bg-secondary"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                  <div className="rounded-lg border border-border bg-secondary/20 p-2.5">
                    <span className="text-muted-foreground block text-[11px] font-semibold">{t('team.members.email')}</span>
                    <span className="font-bold text-foreground truncate block">{selectedCoordinator.email}</span>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/20 p-2.5">
                    <span className="text-muted-foreground block text-[11px] font-semibold">
                      {lang === 'en' ? 'Current Segment & Zone' : 'Segment & Zone actuels'}
                    </span>
                    <span className="font-bold text-foreground truncate block">
                      {selectedCoordinator.displaySegment || selectedCoordinator.segment || 'N/D'}
                    </span>
                  </div>
                </div>

                {/* Formulaire de modification du segment */}
                <div className="rounded-lg border border-border p-3.5 bg-secondary/10 flex flex-col gap-3">
                  <div className="text-[12px] font-bold text-foreground">
                    {lang === 'en' ? 'Modify Segment & Zone' : 'Modifier le segment et la zone'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        {lang === 'en' ? 'Segment Name (e.g. SOHO, PME)' : 'Nom du segment (ex: SOHO, PME)'}
                      </label>
                      <input
                        type="text"
                        value={coordNewSegment}
                        onChange={(e) => setCoordNewSegment(e.target.value)}
                        placeholder="Ex: PME, BTP..."
                        className="h-8.5 w-full rounded-lg border border-border bg-card px-2.5 text-[12.5px] text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                        {lang === 'en' ? 'Geographic Zone (e.g. Ouest, Centre)' : 'Zone géographique (ex: Ouest, Centre)'}
                      </label>
                      <input
                        type="text"
                        value={coordNewZone}
                        onChange={(e) => setCoordNewZone(e.target.value)}
                        placeholder="Ex: Littoral, Nord..."
                        className="h-8.5 w-full rounded-lg border border-border bg-card px-2.5 text-[12.5px] text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <div className="text-[11px] text-muted-foreground">
                      {lang === 'en'
                        ? 'Will automatically propagate to all subordinates and pipeline deals.'
                        : 'Propagé automatiquement aux superviseurs, commerciaux et fiches associées.'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCoordinator(null)}
                        disabled={savingCoordinator}
                        className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {lang === 'en' ? 'Cancel' : 'Annuler'}
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        loading={savingCoordinator}
                        disabled={!coordNewSegment.trim()}
                        onClick={() => void handleUpdateCoordinatorSegment()}
                      >
                        {lang === 'en' ? 'Save Changes' : 'Enregistrer les modifications'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

              {/* Boutons d'invitations selon le niveau de gouvernance */}
              <div className={`grid grid-cols-1 ${isPrimarySeniorManager ? 'md:grid-cols-2' : ''} gap-3.5 pt-1`}>
                {/* 1. Inviter un Superviseur dans mon segment (accessible à TOUS les Coordinateurs) */}
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

                {/* 2. Inviter un Coordinateur pour un nouveau segment (réservé au SM1 initiateur de l'organisation) */}
                {isPrimarySeniorManager && (
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
                      {/* Champs : Segment d'activité (Marché) + Zone géographique (obligatoires) */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            {lang === 'en' ? 'Market segment *' : 'Segment d\'activité (Marché) *'}
                          </label>
                          <input
                            type="text"
                            list="existing-org-segments"
                            placeholder={lang === 'en' ? 'e.g. SOHO, SME, CORP…' : 'ex: SOHO, PME, GRANDS COMPTES…'}
                            value={smSegmentInput}
                            onChange={(e) => setSmSegmentInput(e.target.value)}
                            maxLength={40}
                            className="w-full rounded-lg border border-violet-300/50 dark:border-violet-500/30 bg-white dark:bg-violet-950/20 px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-500/40 uppercase"
                          />
                          {existingOrgSegments.length > 0 && (
                            <datalist id="existing-org-segments">
                              {existingOrgSegments.map((seg) => (
                                <option key={seg} value={seg} />
                              ))}
                            </datalist>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            {lang === 'en' ? 'Zone *' : 'Zone *'}
                          </label>
                          <input
                            type="text"
                            placeholder={lang === 'en' ? 'e.g. Littoral, Centre, Direct…' : 'ex: Littoral, Centre, Canal Direct…'}
                            value={smZoneInput}
                            onChange={(e) => setSmZoneInput(e.target.value)}
                            maxLength={40}
                            className="w-full rounded-lg border border-violet-300/50 dark:border-violet-500/30 bg-white dark:bg-violet-950/20 px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                          />
                        </div>
                      </div>
                      {(smSegmentInput.trim() || smZoneInput.trim()) && (
                        <p className="mt-1.5 text-[11px] text-violet-700 dark:text-violet-300 font-medium">
                          {lang === 'en' ? 'Coordinator label:' : 'Libellé Coordinateur :'}{' '}
                          <span className="font-bold">
                            {smSegmentInput.trim().toUpperCase() || 'N/D'} ({smZoneInput.trim() || 'N/D'})
                          </span>
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void generateAndCopySmInvite()}
                      disabled={generatingInvite === 'sm' || !smSegmentInput.trim() || !smZoneInput.trim()}
                      className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-violet-400 dark:border-violet-500/50 bg-violet-100 dark:bg-violet-500/20 px-3 py-2 text-[12.5px] font-bold text-violet-800 dark:text-violet-200 transition-colors hover:bg-violet-200 dark:hover:bg-violet-500/30 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {copiedSmInvite ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Link2 size={14} className="shrink-0" />}
                      {copiedSmInvite ? t('team.orgGovernance.smLinkCopied') : generatingInvite === 'sm' ? t('team.orgGovernance.generating') : t('team.orgGovernance.copySmLink')}
                    </button>
                  </div>
                )}

                {/* 3. Inviter un membre de la Direction / Observateur Exécutif (Enterprise uniquement, réservé au SM1) */}
                {isPrimarySeniorManager && (user?.plan === 'enterprise' || DEPLOYMENT_CONFIG.isEnterprise) && (
                  <div className="flex flex-col justify-between rounded-xl border border-blue-500/30 bg-blue-50/20 dark:bg-blue-500/10 p-4 md:col-span-2">
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-[13.5px] text-foreground flex items-center gap-2">
                          <Briefcase size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>Inviter un Responsable Exécutif</span>
                        </span>
                        <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/30 px-2 py-0.5 rounded-md">
                          Option Enterprise · Lecture Seule
                        </span>
                      </div>
                      <p className="mt-1.5 mb-0 text-[12px] text-muted-foreground leading-relaxed">
                        Génère un lien d'accès sécurisé pour un responsable de haut niveau (DG, DAF, Président, Auditeur…). Donne accès au tableau de bord consolidé en lecture seule et aux super-exports.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {/* Champ : Titre / Fonction personnalisée */}
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            Titre / Fonction de la personne invitée
                          </label>
                          <input
                            type="text"
                            placeholder="ex: Directeur Général, Président, DAF, Associé…"
                            value={executiveCustomLabel}
                            onChange={(e) => setExecutiveCustomLabel(e.target.value)}
                            maxLength={60}
                            className="w-full rounded-lg border border-blue-300/50 dark:border-blue-500/30 bg-white dark:bg-blue-950/20 px-3 py-2 text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          />
                        </div>
                        {/* Champ : Segments d'affectation (Dropdown compact avec cases à cocher) */}
                        <div className="relative" ref={executiveSegmentsDropdownRef}>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            {lang === 'en' ? 'Observed Segments' : 'Segments sous observation'}
                          </label>
                          <button
                            type="button"
                            onClick={() => setExecutiveSegmentsDropdownOpen((prev) => !prev)}
                            className="w-full flex items-center justify-between gap-2 rounded-lg border border-blue-300/50 dark:border-blue-500/30 bg-white dark:bg-blue-950/20 px-3 py-2 text-[12.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer h-[38px] text-left"
                          >
                            <span className="truncate font-medium">{executiveSegmentsButtonLabel}</span>
                            <ChevronDown
                              size={14}
                              className={`text-muted-foreground shrink-0 transition-transform duration-150 ${
                                executiveSegmentsDropdownOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {/* Menu déroulant Popover - 100% Opaque (Règle 8 AGENTS.md) */}
                          {executiveSegmentsDropdownOpen && (
                            <div
                              className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-xl border border-blue-300/60 dark:border-blue-500/40 shadow-xl p-2.5 space-y-2 max-h-60 overflow-y-auto"
                              style={{ backgroundColor: 'var(--card, #121826)' }}
                            >
                              {/* Option 1 : Supervision Globale */}
                              <label className="flex items-center gap-2.5 cursor-pointer text-[12px] font-semibold text-foreground hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-500/10">
                                <input
                                  type="checkbox"
                                  checked={isExecutiveAllSegments}
                                  onChange={(e) => {
                                    setIsExecutiveAllSegments(e.target.checked)
                                    if (e.target.checked) {
                                      setSelectedExecutiveSegments([])
                                    } else if (coordinatorSegments.length > 0 && coordinatorSegments[0]?.segment) {
                                      setSelectedExecutiveSegments([coordinatorSegments[0].segment])
                                    }
                                  }}
                                  className="rounded border-blue-400 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                />
                                <span>
                                  {lang === 'en'
                                    ? 'All organization segments (Global Oversight)'
                                    : 'Tous les segments de l’organisation (Supervision Globale)'}
                                </span>
                              </label>

                              {/* Option 2 : Liste des segments individuels */}
                              {coordinatorSegments.length > 0 && (
                                <div className="border-t border-border/60 pt-2 space-y-1">
                                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 pb-1">
                                    {lang === 'en' ? 'Or select specific segments :' : 'Ou sélectionnez des segments spécifiques :'}
                                  </span>
                                  {coordinatorSegments.map((c) => {
                                    const isChecked = !isExecutiveAllSegments && selectedExecutiveSegments.includes(c.segment)
                                    return (
                                      <label
                                        key={c.segment}
                                        className="flex items-center gap-2.5 cursor-pointer text-[11.5px] text-foreground hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-500/10"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setIsExecutiveAllSegments(false)
                                              setSelectedExecutiveSegments((prev) => [...prev, c.segment])
                                            } else {
                                              const next = selectedExecutiveSegments.filter((s) => s !== c.segment)
                                              if (next.length === 0) {
                                                setIsExecutiveAllSegments(true)
                                              }
                                              setSelectedExecutiveSegments(next)
                                            }
                                          }}
                                          className="rounded border-blue-400 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                        />
                                        <span className="truncate">
                                          <span className="font-semibold">{c.segment}</span>
                                        </span>
                                      </label>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {isExecutiveAllSegments ? (
                        <p className="mt-1.5 text-[11px] text-blue-700 dark:text-blue-300">
                          {lang === 'en'
                            ? 'This executive will have global read-only oversight across all coordinators and segments.'
                            : 'Cet exécutif disposera d’une visibilité transverse en lecture seule sur tous les coordinateurs et segments.'}
                        </p>
                      ) : selectedExecutiveSegments.length === 1 ? (
                        <p className="mt-1.5 text-[11px] text-blue-700 dark:text-blue-300">
                          {lang === 'en'
                            ? `This executive will be restricted to the "${selectedExecutiveSegments[0]}" segment.`
                            : `Cet exécutif sera restreint à la supervision exclusive du segment « ${selectedExecutiveSegments[0]} ».`}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] text-blue-700 dark:text-blue-300">
                          {lang === 'en'
                            ? `This executive will be restricted to the following segments: ${selectedExecutiveSegments.join(', ')}.`
                            : `Cet exécutif sera restreint à la supervision exclusive des segments : ${selectedExecutiveSegments.join(', ')}.`}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void generateAndCopyExecutiveInvite()}
                      disabled={generatingInvite === 'executive' || (!isExecutiveAllSegments && selectedExecutiveSegments.length === 0)}
                      className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/50 bg-blue-600 px-3.5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-blue-700 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {copiedExecutiveInvite ? <Check size={14} className="text-emerald-300" /> : <Link2 size={14} className="shrink-0" />}
                      {copiedExecutiveInvite
                        ? `Lien ${executiveCustomLabel.trim() || 'Exécutif'} copié !`
                        : generatingInvite === 'executive'
                          ? t('team.orgGovernance.generating')
                          : `Générer le lien – ${executiveCustomLabel.trim() || 'Responsable Exécutif'}`}
                    </button>

                    {/* Gestion des segments des Responsables Exécutifs existants (SM1 uniquement) */}
                    {orgData?.executives && orgData.executives.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-blue-500/20 space-y-2.5">
                        <div className="text-[11.5px] font-bold text-foreground flex items-center justify-between">
                          <span>
                            {lang === 'en'
                              ? `Existing Executive Managers (${orgData.executives.length})`
                              : `Responsables Exécutifs actifs (${orgData.executives.length})`}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {orgData.executives.map((exec) => {
                            const isEditing = editingExecUid === exec.uid
                            const currentLabel =
                              exec.segments && exec.segments.length > 0
                                ? exec.segments.join(', ')
                                : lang === 'en'
                                  ? 'All segments (Global)'
                                  : 'Tous les segments (Global)'
                            return (
                              <div
                                key={exec.uid}
                                className="rounded-lg border border-blue-300/40 dark:border-blue-500/25 bg-white/70 dark:bg-blue-950/20 p-2.5 text-[12px]"
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="min-w-0">
                                    <div className="font-semibold text-foreground truncate">
                                      {exec.name}
                                      {exec.customRoleLabel && (
                                        <span className="ml-1.5 text-[10.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 px-1.5 py-0.5 rounded">
                                          {exec.customRoleLabel}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground truncate">
                                      {exec.email} · <span className="font-medium text-foreground">{currentLabel}</span>
                                    </div>
                                  </div>
                                  {!isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => startEditingExecSegments(exec)}
                                      className="rounded-md border border-blue-400/50 bg-blue-50 dark:bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/25 cursor-pointer shrink-0"
                                    >
                                      {lang === 'en' ? 'Edit segments' : 'Modifier les segments'}
                                    </button>
                                  )}
                                </div>

                                {isEditing && (
                                  <div className="mt-2.5 pt-2.5 border-t border-blue-300/30 space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer text-[11.5px] font-semibold text-foreground">
                                      <input
                                        type="checkbox"
                                        checked={editingExecAll}
                                        onChange={(e) => {
                                          setEditingExecAll(e.target.checked)
                                          if (e.target.checked) {
                                            setEditingExecSegments([])
                                          } else if (coordinatorSegments.length > 0 && coordinatorSegments[0]?.segment) {
                                            setEditingExecSegments([coordinatorSegments[0].segment])
                                          }
                                        }}
                                        className="rounded border-blue-400 text-blue-600 h-3.5 w-3.5 cursor-pointer"
                                      />
                                      <span>
                                        {lang === 'en'
                                          ? 'All organization segments (Global Oversight)'
                                          : 'Tous les segments de l’organisation (Global)'}
                                      </span>
                                    </label>
                                    {coordinatorSegments.length > 0 && (
                                      <div className="flex flex-wrap gap-2">
                                        {coordinatorSegments.map((c) => {
                                          const checked = !editingExecAll && editingExecSegments.includes(c.segment)
                                          return (
                                            <label
                                              key={c.segment}
                                              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] cursor-pointer hover:bg-blue-500/10"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setEditingExecAll(false)
                                                    setEditingExecSegments((prev) => [...prev, c.segment])
                                                  } else {
                                                    const next = editingExecSegments.filter((s) => s !== c.segment)
                                                    if (next.length === 0) setEditingExecAll(true)
                                                    setEditingExecSegments(next)
                                                  }
                                                }}
                                                className="rounded border-blue-400 text-blue-600 h-3 w-3 cursor-pointer"
                                              />
                                              <span className="font-semibold">{c.segment}</span>
                                            </label>
                                          )
                                        })}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => setEditingExecUid(null)}
                                        disabled={savingExecSegments}
                                        className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                                      >
                                        {lang === 'en' ? 'Cancel' : 'Annuler'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void saveExecSegments(exec.uid)}
                                        disabled={savingExecSegments || (!editingExecAll && editingExecSegments.length === 0)}
                                        className="rounded-md bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                                      >
                                        {savingExecSegments
                                          ? (lang === 'en' ? 'Saving…' : 'Enregistrement…')
                                          : (lang === 'en' ? 'Save' : 'Enregistrer')}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

              {canEditGovernance ? (
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
              ) : (
                <div className="text-[13px] font-medium text-foreground">
                  {orgData?.niu || user?.niu || (lang === 'en' ? 'Not provided' : 'Non renseigné')}
                </div>
              )}
            </div>
          </div>
        </DataCard>

        {/* ── 2. Outil de Sélection & Transfert de Prospects vers un Team Manager ── */}
        {isSeniorManager && (
          <DataCard
            title={t('team.orgGovernance.transferCardTitle')}
            subtitle={
              <>
                <strong className="block mb-1">{t('team.orgGovernance.transferTooltipTitle')}</strong>
                {t('team.orgGovernance.transferTooltipDesc')}
              </>
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
                        className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${prospectStatusFilter === st
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
                              className={`cursor-pointer border-b border-border/50 transition-colors hover:bg-secondary/40 ${isSelected ? 'bg-primary/10' : ''
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
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${p.status === 'conclue'
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
                                  : 'N/D'}
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
                    <div className="flex items-center gap-1.5">
                      <label className="text-[13px] font-bold text-foreground">
                        {t('team.orgGovernance.receiverLabel')}
                      </label>
                      <InfoTooltip
                        content={t('team.orgGovernance.receiverDesc')}
                        size={13}
                        placement="right"
                      />
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
                      <span>Délai d'intervention accordé au Superviseur :</span>
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
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${deadlineOption === opt.id
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
