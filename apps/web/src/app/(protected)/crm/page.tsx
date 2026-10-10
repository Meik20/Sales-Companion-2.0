'use client'

import { AppShell } from '@/components/layout/AppShell'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ClientDrawer } from '@/features/crm/components/ClientDrawer'
import { CrmTable } from '@/features/crm/components/CrmTable'
import { CrmMobileCard } from '@/features/crm/components/CrmMobileCard'
import { CrmFilters, type CrmFiltersState } from '@/features/crm/components/CrmFilters'
import { CrmSkeleton, CrmMobileSkeleton } from '@/features/crm/components/CrmSkeleton'
import { AddClientModal } from '@/features/crm/components/AddClientModal'
import { Trash2 } from 'lucide-react'
import type { CrmClient, CrmClientStatus } from '@/features/crm/types'

const PAGE_SIZE = 20

const ACTIVE_STATUSES = new Set([
  'new',
  'to_contact',
  'contacted',
  'in_discussion',
  'proposal_sent'
])

export default function CrmPage() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()

  // Data
  const [clients, setClients] = useState<CrmClient[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Filters + pagination
  const [filters, setFilters] = useState<CrmFiltersState>({
    search: '',
    status: '',
    sector: '',
    city: '',
    sortBy: 'lastActivityAt'
  })
  const [page, setPage] = useState(1)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/crm/clients', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setClients(data)
      }
    } catch (e) {
      console.error('[CRM] fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchClients()
  }, [fetchClients])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [filters])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeCount = useMemo(
    () => clients.filter((c) => ACTIVE_STATUSES.has(c.status)).length,
    [clients]
  )
  const toFollowUpCount = useMemo(
    () => clients.filter((c) => c.status === 'to_contact').length,
    [clients]
  )

  // ── Filter + Sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...clients]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (c) =>
          c.companyName?.toLowerCase().includes(q) ||
          c.companyCity?.toLowerCase().includes(q) ||
          c.companySector?.toLowerCase().includes(q) ||
          c.companyPhone?.includes(q) ||
          c.contactName?.toLowerCase().includes(q)
      )
    }

    if (filters.status === 'active_group') {
      list = list.filter((c) => ACTIVE_STATUSES.has(c.status))
    } else if (filters.status) {
      list = list.filter((c) => c.status === filters.status)
    }

    if (filters.sector)
      list = list.filter((c) => c.companySector === filters.sector || c.sector === filters.sector)
    if (filters.city)
      list = list.filter((c) => c.companyCity === filters.city || c.city === filters.city)

    // Sort
    list.sort((a, b) => {
      if (filters.sortBy === 'companyName')
        return (a.companyName || '').localeCompare(b.companyName || '')
      if (filters.sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      if (filters.sortBy === 'nextActionAt') {
        if (!a.nextActionAt) return 1
        if (!b.nextActionAt) return -1
        return new Date(a.nextActionAt).getTime() - new Date(b.nextActionAt).getTime()
      }
      // lastActivityAt (default)
      if (!a.lastActivityAt) return 1
      if (!b.lastActivityAt) return -1
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    })

    return list
  }, [clients, filters])

  // Paginate
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(
    async (clientId: string, newStatus: CrmClientStatus) => {
      if (!user) return
      // Optimistic update
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c)))
      if (selectedClient?.id === clientId)
        setSelectedClient((s) => (s ? { ...s, status: newStatus } : s))
      try {
        const token = await user.getIdToken()
        await fetch(`/api/crm/clients/${clientId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      } catch (e) {
        console.error('[CRM] status update error', e)
        void fetchClients()
      }
    },
    [user, selectedClient, fetchClients]
  )

  const handleNextActionSave = useCallback(
    async (clientId: string, text: string) => {
      if (!user) return
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, nextAction: text } : c)))
      try {
        const token = await user.getIdToken()
        await fetch(`/api/crm/clients/${clientId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nextAction: text })
        })
      } catch (e) {
        console.error('[CRM] next action error', e)
      }
    },
    [user]
  )

  const handleDelete = useCallback(
    async (clientId: string) => {
      if (!user) return
      setClients((prev) => prev.filter((c) => c.id !== clientId))
      if (selectedClient?.id === clientId) setSelectedClient(null)
      try {
        const token = await user.getIdToken()
        await fetch(`/api/crm/clients/${clientId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (e) {
        console.error('[CRM] delete error', e)
        void fetchClients()
      }
    },
    [user, selectedClient, fetchClients]
  )

  const handleClientAdded = useCallback(() => {
    setShowAddModal(false)
    void fetchClients()
  }, [fetchClients])

  const handleClearCrm = useCallback(async () => {
    if (!user) return
    setClearing(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/crm/clients/clear', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setClients([])
        setSelectedClient(null)
        setShowClearConfirm(false)
      }
    } catch (e) {
      console.error('[CRM] clear error', e)
    } finally {
      setClearing(false)
    }
  }, [user])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      {/* Page Title */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-['Syne',sans-serif] text-[24px] font-extrabold text-foreground">
            {t('crm.title')}
          </h1>
          {!loading && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              {clients.length} {t('crm.headerClients')} ·{' '}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {activeCount} {t('crm.headerActive')}
              </span>{' '}
              ·{' '}
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {toFollowUpCount} {t('crm.headerToFollowUp')}
              </span>
            </p>
          )}
        </div>

        {clients.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 text-[13px] font-medium text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
          >
            <Trash2 size={15} />
            <span>Vider mon CRM</span>
          </button>
        )}
      </div>

      {/* Filters + Add button */}
      <CrmFilters
        filters={filters}
        onChange={setFilters}
        onAddClient={() => setShowAddModal(true)}
        totalCount={clients.length}
        activeCount={activeCount}
        toFollowUpCount={toFollowUpCount}
      />

      {/* Content */}
      {loading ? (
        <>
          <CrmSkeleton />
          <CrmMobileSkeleton />
        </>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <CrmTable
              clients={paginated}
              onSelect={setSelectedClient}
              onStatusChange={handleStatusChange}
              onNextActionSave={handleNextActionSave}
              onDelete={handleDelete}
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={filtered.length}
              onPageChange={setPage}
            />
          </div>

          {/* Mobile cards */}
          <CrmMobileCard
            clients={paginated}
            onSelect={setSelectedClient}
            onStatusChange={handleStatusChange}
          />
        </>
      )}

      {/* Client Drawer */}
      {selectedClient && (
        <ClientDrawer client={selectedClient} onClose={() => setSelectedClient(null)} user={user} />
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <AddClientModal
          user={user}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleClientAdded}
        />
      )}

      {/* Clear CRM Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <Trash2 size={20} />
              </div>
              <h3 className="font-['Syne',sans-serif] text-[18px] font-bold text-foreground">
                Vider votre CRM ?
              </h3>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">
              Êtes-vous sûr de vouloir vider votre CRM ? Tous les clients actuels seront retirés de votre espace support.
            </p>
            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[12px] text-emerald-700 dark:text-emerald-300">
              🛡️ <strong>Garantie d’indépendance :</strong> Cette action n’affecte en aucun cas la <strong>Base de données clients</strong> du Team Manager ni les ventes conclues de l’entreprise.
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted"
              >
                Annuler
              </button>
              <button
                onClick={handleClearCrm}
                disabled={clearing}
                className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {clearing ? 'Suppression en cours...' : 'Oui, vider mon CRM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
