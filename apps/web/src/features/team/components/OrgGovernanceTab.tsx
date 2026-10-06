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
  Users2
} from 'lucide-react'

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

  // Migration tool
  const [selectedTargetUid, setSelectedTargetUid] = useState<string>('')
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<string | null>(null)
  const [migrationError, setMigrationError] = useState<string | null>(null)

  const isSeniorManager = user?.orgRole === 'senior_manager'

  const fetchOrg = async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
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

  const handleMigrate = async () => {
    if (!selectedTargetUid) return
    const targetMgr = orgData?.managers?.find((m) => m.uid === selectedTargetUid)
    const confirmMsg = `Confirmez-vous le transfert de tous les commerciaux, prospects et assignations du compte Senior vers le Team Manager "${targetMgr?.name || selectedTargetUid}" ?`
    if (!window.confirm(confirmMsg)) return

    setMigrating(true)
    setMigrationError(null)
    setMigrationResult(null)

    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/team/migrate-senior-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetManagerUid: selectedTargetUid })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la migration')

      const { migratedCount, targetManager } = data
      const summary = `✓ Transfert réussi vers ${targetManager.name} : ${migratedCount.pipeline} prospects, ${migratedCount.teamAccesses} accès commerciaux, ${migratedCount.assignments} assignations.`
      setMigrationResult(summary)
      pushToast({ type: 'success', title: 'Migration réussie' })
      void fetchOrg()
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

      {/* ── 2. Outil de Réaffectation / Migration vers un Team Manager ── */}
      {isSeniorManager && (
        <DataCard
          title="Migration des Membres & Prospects vers un Team Manager"
          subtitle="Transférez les commerciaux ou prospects historiques encore rattachés au compte Senior vers un Team Manager de terrain"
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-[13px] text-blue-300 flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 text-blue-400 mt-0.5" />
              <div>
                <strong>Séparation stricte des rôles :</strong> Le Senior Manager supervise l&apos;organisation et n&apos;est pas un manager de terrain. Si des commerciaux ou des prospects avaient été rattachés initialement à votre compte, vous pouvez les déléguer en 1 clic à l&apos;un de vos Team Managers.
              </div>
            </div>

            {teamManagers.length > 0 ? (
              <div className="flex flex-col gap-3">
                <label className="text-[13px] font-semibold text-foreground">
                  Sélectionnez le Team Manager récepteur :
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedTargetUid}
                    onChange={(e) => setSelectedTargetUid(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-card px-3 text-[13px] text-foreground focus:border-primary focus:outline-none"
                    style={{ minWidth: 260 }}
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
                    disabled={!selectedTargetUid || migrating}
                    onClick={() => void handleMigrate()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <ArrowRightLeft size={14} />
                    Transférer les membres &amp; prospects
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
                Aucun Team Manager n&apos;est encore disponible dans votre organisation. Invitez un premier manager d&apos;équipe pour pouvoir lui transférer des commerciaux.
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
