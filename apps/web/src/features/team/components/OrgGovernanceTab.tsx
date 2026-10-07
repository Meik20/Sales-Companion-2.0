'use client'

import { useState, useEffect } from 'react'
import { DataCard } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
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
  Search,
  CheckSquare,
  Square,
  MapPin,
  Phone,
  Briefcase,
  Calendar,
  Filter,
  RefreshCw
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
  isCurrent: boolean
  isSenior: boolean
  createdAt?: string | null
}

interface OrgData {
  orgCode: string
  orgRole: 'senior_manager' | 'team_manager'
  isSeniorManager: boolean
  niu: string | null
  isVerified: boolean
  companyName: string
  sector?: string | null
  managers?: OrgManagerItem[]
}

export function OrgGovernanceTab() {
  const { user } = useCurrentUser()
  const { pushToast } = useToast()

  const [orgData, setOrgData] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)

  // NIU form
  const [niuInput, setNiuInput] = useState('')
  const [niuLoading, setNiuLoading] = useState(false)
  const [niuError, setNiuError] = useState<string | null>(null)
  const [niuSuccess, setNiuSuccess] = useState<string | null>(null)

  // Copy code & invite
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)

  // Prospect selection & transfer tool
  const [seniorProspects, setSeniorProspects] = useState<SeniorProspect[]>([])
  const [loadingProspects, setLoadingProspects] = useState(false)
  const [selectedProspectIds, setSelectedProspectIds] = useState<string[]>([])
  const [prospectSearch, setProspectSearch] = useState('')
  const [prospectStatusFilter, setProspectStatusFilter] = useState<'all' | 'prospection' | 'negociation' | 'conclue'>('all')

  const [selectedTargetUid, setSelectedTargetUid] = useState<string>('')
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<string | null>(null)
  const [migrationError, setMigrationError] = useState<string | null>(null)

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

  const fetchOrg = async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      if (!token) return
      const res = await fetch('/api/team/org', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data && !data.error) {
        setOrgData(data)
        if (data.niu) setNiuInput(data.niu)
      }
    } catch {
      // Ignorer
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchOrg()
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
    pushToast({ type: 'success', title: 'Code organisation copié dans le presse-papiers' })
  }

  const copyInviteLink = async () => {
    const code = orgData?.orgCode || user?.orgCode
    if (!code) return
    const link = `${window.location.origin}/register?role=manager&org=${code}`
    await navigator.clipboard.writeText(link)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 2000)
    pushToast({ type: 'success', title: 'Lien d\'invitation copié' })
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
      setNiuSuccess('Numéro d\'identification mis à jour avec succès.')
      pushToast({ type: 'success', title: 'NIU fiscal mis à jour' })
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
    const matchesStatus =
      prospectStatusFilter === 'all' || p.status === prospectStatusFilter
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
        title: 'Sélectionnez un Team Manager',
        description: 'Veuillez choisir le Team Manager destinataire du transfert.'
      })
      return
    }

    const count = selectedProspectIds.length
    if (count === 0) {
      pushToast({
        type: 'warning',
        title: 'Aucun prospect sélectionné',
        description: 'Veuillez cocher au moins un prospect avant de lancer le transfert.'
      })
      return
    }

    const targetMgr = orgData?.managers?.find((m) => m.uid === selectedTargetUid)
    const targetName = targetMgr?.name || selectedTargetUid
    const confirmMsg = `Confirmez-vous le transfert de ${count} prospect${count > 1 ? 's' : ''} vers le Team Manager "${targetName}" ?\n\nCes prospects intègreront son portefeuille sans être assignés à un commercial. Le Team Manager pourra ensuite les attribuer à ses commerciaux de terrain.`
    if (!window.confirm(confirmMsg)) return

    setMigrating(true)
    setMigrationError(null)
    setMigrationResult(null)

    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/team/migrate-senior-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          targetManagerUid: selectedTargetUid,
          prospectIds: selectedProspectIds
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors du transfert')

      const { migratedCount, targetManager } = data
      const summary = `✓ Transfert réussi vers ${targetManager.name} : ${migratedCount.pipeline} prospect(s) transféré(s) dans son portefeuille (en attente d'attribution à ses commerciaux).`
      setMigrationResult(summary)
      setSelectedProspectIds([])
      pushToast({
        type: 'success',
        title: 'Transfert réussi',
        description: `${count} prospect(s) transféré(s) vers ${targetManager.name}`
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
        Chargement des paramètres de l&apos;organisation…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── 1. Carte Identité & Gouvernance ────────────────────────── */}
      <DataCard
        title="Organisation & Gouvernance"
        subtitle="Identifiant unique de votre entreprise, certification fiscale DGI et recrutement de managers"
      >
        <div className="flex flex-col gap-6">
          {/* Entreprise & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Entreprise
              </span>
              <h4 className="mt-1 text-[17px] font-bold text-foreground flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                {orgData?.companyName || user?.companyName || user?.company || 'Votre Organisation'}
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[12px] font-bold text-violet-400">
                ★ Senior Manager
              </span>
              {orgData?.isVerified || Boolean(user?.niu) ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[12px] font-bold text-green-400">
                  <ShieldCheck size={14} className="text-green-400" />
                  Organisation vérifiée DGI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[12px] font-semibold text-amber-400">
                  <ShieldAlert size={14} className="text-amber-400" />
                  Organisation standard
                </span>
              )}
            </div>
          </div>

          {/* Code Organisation unique + Partage */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[12px] font-semibold text-muted-foreground">
                  Code Organisation Unique (ORG Code)
                </div>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <code className="rounded-md bg-primary/10 px-3 py-1 font-mono text-[16px] font-extrabold text-primary">
                    {orgData?.orgCode || user?.orgCode || 'Chargement…'}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyOrgCode()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1 text-[12px] font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    {copiedCode ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                    {copiedCode ? 'Copié !' : 'Copier'}
                  </button>
                </div>
              </div>

              {/* Bouton d'invitation Manager */}
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => void copyInviteLink()}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/15 px-3.5 py-1.5 text-[12.5px] font-semibold text-primary transition-colors hover:bg-primary/25"
                >
                  {copiedInvite ? <Check size={14} /> : <span>🔗</span>}
                  {copiedInvite ? 'Lien copié !' : 'Copier le lien d\'invitation Team Manager'}
                </button>
                <p className="text-[11px] text-muted-foreground">
                  Partagez ce lien à vos managers d&apos;équipe pour qu&apos;ils rejoignent directement l&apos;organisation.
                </p>
              </div>
            </div>
          </div>

          {/* NIU Fiscal Section */}
          <div className="flex flex-col gap-3 border-t border-border pt-6">
            <h4 className="m-0 text-[14px] font-bold text-foreground">
              Numéro d&apos;Identification Unique (NIU fiscal DGI)
            </h4>
            <p className="m-0 text-[12.5px] leading-relaxed text-muted-foreground">
              Renseignez le NIU fiscal officiel de votre société délivré par la DGI (carte de contribuable) pour certifier votre organisation et unifier l&apos;ensemble de vos managers d&apos;équipe.
            </p>

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
                  Enregistrer
                </Button>
              </div>
              {niuError && <div className="text-[12px] text-red-400">{niuError}</div>}
              {niuSuccess && <div className="text-[12px] text-green-400">{niuSuccess}</div>}
            </form>
          </div>
        </div>
      </DataCard>

      {/* ── 2. Outil de Sélection & Transfert de Prospects vers un Team Manager ── */}
      {isSeniorManager && (
        <DataCard
          title="Transfert de Prospects vers un Team Manager"
          subtitle="Sélectionnez précisément les prospects de votre compte Senior à transférer à un Team Manager de terrain"
        >
          <div className="flex flex-col gap-5">
            {/* Bannière explicative - Séparation des rôles */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-[13px] text-blue-300 flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 text-blue-400 mt-0.5" />
              <div>
                <strong>Transfert de portefeuille (séparation stricte des rôles) :</strong> Le Senior Manager supervise l&apos;organisation globale. Le Team Manager n&apos;est pas un commercial : lorsqu&apos;il reçoit des prospects, ils intègrent son portefeuille en attente d&apos;attribution (non assignés). Le Team Manager pourra ensuite les déléguer individuellement à ses propres commerciaux de terrain.
              </div>
            </div>

            {/* Outils de filtre & recherche */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h5 className="m-0 text-[14px] font-bold text-foreground flex items-center gap-2">
                    <Briefcase size={16} className="text-primary" />
                    Prospects du compte Senior ({seniorProspects.length})
                  </h5>
                  {selectedProspectIds.length > 0 && (
                    <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[11.5px] font-bold text-primary">
                      {selectedProspectIds.length} sélectionné{selectedProspectIds.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchSeniorProspects()}
                    disabled={loadingProspects}
                    title="Actualiser la liste des prospects"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[12px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <RefreshCw size={12} className={loadingProspects ? 'animate-spin' : ''} />
                    Actualiser
                  </button>

                  {filteredProspects.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                    >
                      {allFilteredSelected ? <Square size={13} /> : <CheckSquare size={13} />}
                      {allFilteredSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  )}
                </div>
              </div>

              {/* Barre de recherche et filtres de statut */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filtrer par nom, ville ou secteur…"
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
                        ? 'Tous'
                        : st === 'prospection'
                        ? 'Prospection'
                        : st === 'negociation'
                        ? 'Négociation'
                        : 'Conclue'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table / Liste des prospects sélectionnables */}
              <div className="mt-2 max-h-[360px] overflow-y-auto rounded-lg border border-border bg-background/50">
                {loadingProspects ? (
                  <div className="p-8 text-center text-[13px] text-muted-foreground">
                    Chargement des prospects du compte Senior…
                  </div>
                ) : filteredProspects.length === 0 ? (
                  <div className="p-8 text-center text-[13px] text-muted-foreground italic">
                    {seniorProspects.length === 0
                      ? 'Aucun prospect rattaché à votre compte Senior. Tous vos prospects ont été transférés ou sont gérés directement par vos Team Managers.'
                      : 'Aucun prospect ne correspond à vos critères de recherche.'}
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
                            aria-label="Sélectionner tous les prospects"
                          />
                        </th>
                        <th className="py-2.5 px-3">Entreprise</th>
                        <th className="py-2.5 px-3">Ville &amp; Secteur</th>
                        <th className="py-2.5 px-3">Statut Pipeline</th>
                        <th className="py-2.5 pr-3 text-right">Date d&apos;ajout</th>
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
                            <td className="py-3 pl-3 pr-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectProspect(p.id)}
                                className="cursor-pointer accent-primary"
                                aria-label={`Sélectionner ${p.companyName}`}
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
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : p.status === 'negociation'
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {p.status === 'conclue'
                                  ? 'Conclue'
                                  : p.status === 'negociation'
                                  ? 'Négociation'
                                  : 'Prospection'}
                              </span>
                            </td>
                            <td className="py-3 pr-3 text-right text-[11.5px] text-muted-foreground">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}
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
                      1. Choisir le Team Manager récepteur :
                    </label>
                    <p className="m-0 text-[11.5px] text-muted-foreground">
                      Les prospects sélectionnés lui seront transférés pour qu&apos;il puisse les assigner à ses commerciaux.
                    </p>
                  </div>

                  {selectedProspectIds.length > 0 && (
                    <div className="text-[12.5px] font-bold text-primary">
                      {selectedProspectIds.length} prospect{selectedProspectIds.length > 1 ? 's' : ''} sélectionné{selectedProspectIds.length > 1 ? 's' : ''}
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
                    <option value="">-- Choisir un Team Manager --</option>
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
                      ? `Transférer ${selectedProspectIds.length} prospect${selectedProspectIds.length > 1 ? 's' : ''} vers le Team Manager`
                      : 'Transférer vers le Team Manager'}
                  </Button>
                </div>

                {migrationResult && (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-[13px] text-green-400 font-medium">
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
                Aucun Team Manager n&apos;est encore disponible dans votre organisation. Invitez un premier manager d&apos;équipe pour pouvoir lui transférer des prospects.
              </div>
            )}
          </div>
        </DataCard>
      )}

      {/* ── 3. Supervision des Team Managers ────────────────────────── */}
      <DataCard
        title="Gestion de l'Équipe Organisation"
        subtitle="Supervision de tous les Team Managers rattachés à votre organisation et leurs performances pipeline"
      >
        <OrgManagersSection
          managers={(orgData?.managers || []) as any}
          orgCode={orgData?.orgCode || ''}
        />
      </DataCard>
    </div>
  )
}
