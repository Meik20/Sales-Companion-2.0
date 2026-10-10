'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'
import {
  Users,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Filter,
  UserCheck,
  Briefcase,
  ExternalLink,
  ChevronRight,
  X,
  AlertCircle
} from 'lucide-react'
import type { ClientDoc } from '@sales-companion/shared'

function formatCurrency(amount: number | null | undefined, currency: string = 'FCFA') {
  if (amount == null) return '0 FCFA'
  return `${new Intl.NumberFormat('fr-FR').format(amount)} ${currency}`
}

export default function ClientDatabasePage() {
  const { user } = useCurrentUser()
  const { t } = useTranslation()

  const [clients, setClients] = useState<ClientDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<string>('all')
  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [selectedClient, setSelectedClient] = useState<ClientDoc | null>(null)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesContent, setNotesContent] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const fetchClients = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        // Guard: ensure response correctly extracts the array whether returned as { clients: [...] } or direct array
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.clients)
            ? data.clients
            : []
        setClients(list)
      } else {
        setClients([])
      }
    } catch (err) {
      console.error('[Clients] fetch error:', err)
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchClients()
  }, [fetchClients])

  // Defensive array fallback
  const safeClients = useMemo(() => (Array.isArray(clients) ? clients : []), [clients])

  // Extract unique sellers / assigned members
  const teamMembers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string }>()
    safeClients.forEach((c) => {
      if (c.assignedTo) {
        map.set(c.assignedTo, {
          id: c.assignedTo,
          name: c.assignedName || 'Membre de l’équipe',
          email: c.assignedEmail ?? undefined
        })
      }
    })
    return Array.from(map.values())
  }, [safeClients])

  // Extract unique sectors
  const sectors = useMemo(() => {
    const set = new Set<string>()
    safeClients.forEach((c) => {
      if (c.companySector) set.add(c.companySector)
    })
    return Array.from(set).sort()
  }, [safeClients])

  // Filter clients
  const filteredClients = useMemo(() => {
    return safeClients.filter((c) => {
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        c.companyName?.toLowerCase().includes(q) ||
        c.contactName?.toLowerCase().includes(q) ||
        c.companyCity?.toLowerCase().includes(q) ||
        c.companyPhone?.includes(q) ||
        c.assignedName?.toLowerCase().includes(q)

      const matchMember =
        selectedMember === 'all' ||
        c.assignedTo === selectedMember

      const matchSector =
        selectedSector === 'all' ||
        c.companySector === selectedSector

      return matchSearch && matchMember && matchSector
    })
  }, [safeClients, search, selectedMember, selectedSector])

  // KPIs
  const totalRevenue = useMemo(() => {
    return safeClients.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)
  }, [safeClients])

  const thisMonthCount = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return safeClients.filter((c) => {
      if (!c.concludedAt) return false
      const d = new Date(c.concludedAt as any)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length
  }, [safeClients])

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredClients.length) return
    const headers = [
      'Entreprise',
      'Contact',
      'Téléphone',
      'Email',
      'Ville',
      'Secteur',
      'Montant',
      'Vendeur',
      'Email Vendeur',
      'Date Conclusion'
    ]
    const rows = filteredClients.map((c) => [
      `"${c.companyName.replace(/"/g, '""')}"`,
      `"${(c.contactName || '').replace(/"/g, '""')}"`,
      `"${c.companyPhone || ''}"`,
      `"${c.companyEmail || ''}"`,
      `"${c.companyCity || ''}"`,
      `"${c.companySector || ''}"`,
      c.amount || '',
      `"${(c.assignedName || '').replace(/"/g, '""')}"`,
      `"${c.assignedEmail || ''}"`,
      c.concludedAt ? new Date(c.concludedAt as any).toLocaleDateString('fr-FR') : ''
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `base-donnees-clients-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenDetail = (client: ClientDoc) => {
    setSelectedClient(client)
    setNotesContent(client.notes || '')
    setIsEditingNotes(false)
  }

  const handleSaveNotes = async () => {
    if (!selectedClient || !user) return
    setSavingNotes(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: notesContent })
      })
      if (res.ok) {
        setClients((prev) =>
          prev.map((c) => (c.id === selectedClient.id ? { ...c, notes: notesContent } : c))
        )
        setSelectedClient((prev) => (prev ? { ...prev, notes: notesContent } : null))
        setIsEditingNotes(false)
      }
    } catch (e) {
      console.error('[Clients] update notes error:', e)
    } finally {
      setSavingNotes(false)
    }
  }

  return (
    <AppShell>
      {/* ── Entête de page ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-['Syne',sans-serif] text-[22px] font-extrabold tracking-tight text-foreground sm:text-[26px]">
                Base de données clients
              </h1>
              <p className="text-[13px] text-muted-foreground">
                Portefeuille officiel des clients enregistrés et ventes conclues de l’équipe.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredClients.length === 0}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 text-[13px] font-medium text-foreground shadow-sm transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={15} />
          <span>Exporter CSV</span>
        </button>
      </div>

      {/* ── Cartes d'indicateurs KPIs ────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total Clients */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium">Clients enregistrés</span>
            <Building2 size={16} className="text-primary" />
          </div>
          <div className="mt-2 font-['Syne',sans-serif] text-[24px] font-bold text-foreground">
            {clients.length}
          </div>
          <span className="text-[11px] text-muted-foreground">Total portefeuille</span>
        </div>

        {/* Chiffre d'Affaires Conclu */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium">CA Conclu Total</span>
            <DollarSign size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 font-['Syne',sans-serif] text-[22px] font-bold text-foreground">
            {formatCurrency(totalRevenue, 'XAF')}
          </div>
          <span className="text-[11px] text-muted-foreground">Ventes validées</span>
        </div>

        {/* Conclus ce mois */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium">Conclus ce mois</span>
            <TrendingUp size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 font-['Syne',sans-serif] text-[24px] font-bold text-foreground">
            {thisMonthCount}
          </div>
          <span className="text-[11px] text-muted-foreground">Nouvelles signatures</span>
        </div>

        {/* Membres Actifs */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium">Commerciaux vendeurs</span>
            <UserCheck size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 font-['Syne',sans-serif] text-[24px] font-bold text-foreground">
            {teamMembers.length}
          </div>
          <span className="text-[11px] text-muted-foreground">Contributeurs</span>
        </div>
      </div>

      {/* ── Filtres & Barre de recherche ───────────────────────────── */}
      <div className="mb-5 flex flex-col gap-2.5 rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:flex-row sm:items-center">
        {/* Recherche textuelle */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par entreprise, contact, ville, commercial..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13px] text-foreground outline-none transition focus:border-primary"
          />
        </div>

        {/* Filtre par membre de l'équipe */}
        <div className="flex items-center gap-2 sm:w-auto">
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12.5px] text-foreground outline-none transition focus:border-primary sm:w-[200px]"
          >
            <option value="all">Tous les commerciaux ({clients.length})</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Filtre secteur */}
          {sectors.length > 0 && (
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12.5px] text-foreground outline-none transition focus:border-primary sm:w-[170px]"
            >
              <option value="all">Tous les secteurs</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Tableau & Liste des clients ─────────────────────────────── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-[13px] text-muted-foreground">Chargement de la base de données clients...</span>
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users size={24} />
          </div>
          <h3 className="mt-3 text-[15px] font-semibold text-foreground">Aucun client trouvé</h3>
          <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
            {clients.length === 0
              ? 'Dès qu’une opportunité est conclue dans le pipeline depuis plus de 72 heures, elle est archivée automatiquement ici avec le détail du vendeur.'
              : 'Aucun client ne correspond à vos filtres actuels.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-border bg-muted/40 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Client & Entreprise</th>
                  <th className="px-4 py-3">Vendu par (Commercial)</th>
                  <th className="px-4 py-3">Montant Conclu</th>
                  <th className="px-4 py-3">Date Conclusion</th>
                  <th className="px-4 py-3">Coordonnées</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClients.map((client) => {
                  const concludedDate = client.concludedAt
                    ? new Date(client.concludedAt as any).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '—'

                  return (
                    <tr
                      key={client.id}
                      onClick={() => handleOpenDetail(client)}
                      className="cursor-pointer transition hover:bg-muted/30"
                    >
                      {/* Entreprise & Contact */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground">{client.companyName}</div>
                        <div className="text-[12px] text-muted-foreground">
                          {client.contactName ? `${client.contactName} · ` : ''}
                          {client.companySector || client.companyCity || '—'}
                        </div>
                      </td>

                      {/* Vendeur (Commercial de terrain / Manager) */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {client.assignedName?.[0]?.toUpperCase() || 'M'}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {client.assignedName || 'Non assigné'}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {client.assignedEmail || client.assignedRole || 'Commercial terrain'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Montant conclu */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {client.amount ? formatCurrency(client.amount, client.currency || 'XAF') : '—'}
                        </span>
                      </td>

                      {/* Date de conclusion */}
                      <td className="px-4 py-3.5 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted-foreground" />
                          {concludedDate}
                        </span>
                      </td>

                      {/* Coordonnées rapides */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {client.companyPhone && (
                            <a
                              href={`tel:${client.companyPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              title={`Appeler : ${client.companyPhone}`}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-primary hover:text-primary"
                            >
                              <Phone size={13} />
                            </a>
                          )}
                          {client.companyEmail && (
                            <a
                              href={`mailto:${client.companyEmail}`}
                              onClick={(e) => e.stopPropagation()}
                              title={`Envoyer un email : ${client.companyEmail}`}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-primary hover:text-primary"
                            >
                              <Mail size={13} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline">
                          Détails
                          <ChevronRight size={14} />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Détail Client ───────────────────────────────────────── */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            {/* Header modal */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Client Conclu
                </span>
                <h3 className="mt-1 font-['Syne',sans-serif] text-[20px] font-bold text-foreground">
                  {selectedClient.companyName}
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  {selectedClient.companySector || 'Secteur non spécifié'} · {selectedClient.companyCity || 'Ville non spécifiée'}
                </p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Informations du Vendeur */}
            <div className="mt-4 rounded-xl border border-border/80 bg-muted/30 p-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Commercial responsable de la signature
              </span>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[14px] font-bold text-primary">
                  {selectedClient.assignedName?.[0]?.toUpperCase() || 'V'}
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {selectedClient.assignedName || 'Non assigné'}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {selectedClient.assignedEmail || 'Email non renseigné'}
                  </div>
                  <div className="text-[11px] text-primary">
                    {selectedClient.assignedRole ? `Rôle : ${selectedClient.assignedRole}` : 'Commercial terrain'}
                  </div>
                </div>
              </div>
            </div>

            {/* Données financières et contact */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
              <div className="rounded-lg border border-border p-3">
                <span className="text-muted-foreground">Montant du contrat</span>
                <div className="mt-1 font-['Syne',sans-serif] text-[16px] font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedClient.amount ? formatCurrency(selectedClient.amount, selectedClient.currency || 'XAF') : 'Non renseigné'}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <span className="text-muted-foreground">Date de conclusion</span>
                <div className="mt-1 font-medium text-foreground">
                  {selectedClient.concludedAt
                    ? new Date(selectedClient.concludedAt as any).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                    : 'Non daté'}
                </div>
              </div>
            </div>

            {/* Coordonnées du contact */}
            <div className="mt-4 space-y-2 rounded-xl border border-border p-3.5 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Contact référent :</span>
                <span className="font-medium text-foreground">{selectedClient.contactName || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Téléphone :</span>
                {selectedClient.companyPhone ? (
                  <a
                    href={`tel:${selectedClient.companyPhone}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Phone size={12} />
                    {selectedClient.companyPhone}
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email :</span>
                {selectedClient.companyEmail ? (
                  <a
                    href={`mailto:${selectedClient.companyEmail}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Mail size={12} />
                    {selectedClient.companyEmail}
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
              {selectedClient.address && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Adresse :</span>
                  <span className="text-right text-foreground">{selectedClient.address}</span>
                </div>
              )}
            </div>

            {/* Notes patrimoniales */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes & Historique
                </span>
                {!isEditingNotes && (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="text-[12px] font-medium text-primary hover:underline"
                  >
                    Modifier
                  </button>
                )}
              </div>

              {isEditingNotes ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={notesContent}
                    onChange={(e) => setNotesContent(e.target.value)}
                    rows={4}
                    placeholder="Ajouter des notes sur le contrat ou le client..."
                    className="w-full rounded-lg border border-border bg-background p-2.5 text-[13px] text-foreground outline-none focus:border-primary"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingNotes(false)}
                      className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {savingNotes ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 text-[13px] text-foreground">
                  {selectedClient.notes ? (
                    <p className="whitespace-pre-wrap">{selectedClient.notes}</p>
                  ) : (
                    <p className="italic text-muted-foreground">Aucune note pour le moment.</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div className="mt-6 flex justify-end border-t border-border pt-4">
              <button
                onClick={() => setSelectedClient(null)}
                className="rounded-lg border border-border bg-muted px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-muted/80"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
