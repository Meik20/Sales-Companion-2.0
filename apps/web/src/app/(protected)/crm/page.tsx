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
import type { CrmClient, CrmClientStatus } from '@/features/crm/types'

const PAGE_SIZE = 20

const ACTIVE_STATUSES = new Set(['new', 'to_contact', 'contacted', 'in_discussion', 'proposal_sent'])

export default function CrmPage() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()

  // Data
  const [clients, setClients] = useState<CrmClient[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

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

  useEffect(() => { void fetchClients() }, [fetchClients])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [filters])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeCount = useMemo(() => clients.filter(c => ACTIVE_STATUSES.has(c.status)).length, [clients])
  const toFollowUpCount = useMemo(() => clients.filter(c => c.status === 'to_contact').length, [clients])

  // ── Filter + Sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...clients]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(c =>
        c.companyName?.toLowerCase().includes(q) ||
        c.companyCity?.toLowerCase().includes(q) ||
        c.companySector?.toLowerCase().includes(q) ||
        c.companyPhone?.includes(q) ||
        c.contactName?.toLowerCase().includes(q)
      )
    }

    if (filters.status === 'active_group') {
      list = list.filter(c => ACTIVE_STATUSES.has(c.status))
    } else if (filters.status) {
      list = list.filter(c => c.status === filters.status)
    }

    if (filters.sector) list = list.filter(c => c.companySector === filters.sector || c.sector === filters.sector)
    if (filters.city) list = list.filter(c => c.companyCity === filters.city || c.city === filters.city)

    // Sort
    list.sort((a, b) => {
      if (filters.sortBy === 'companyName') return (a.companyName || '').localeCompare(b.companyName || '')
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
  const handleStatusChange = useCallback(async (clientId: string, newStatus: CrmClientStatus) => {
    if (!user) return
    // Optimistic update
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c))
    if (selectedClient?.id === clientId) setSelectedClient(s => s ? { ...s, status: newStatus } : s)
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
  }, [user, selectedClient, fetchClients])

  const handleNextActionSave = useCallback(async (clientId: string, text: string) => {
    if (!user) return
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, nextAction: text } : c))
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
  }, [user])

  const handleDelete = useCallback(async (clientId: string) => {
    if (!user) return
    setClients(prev => prev.filter(c => c.id !== clientId))
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
  }, [user, selectedClient, fetchClients])

  const handleClientAdded = useCallback(() => {
    setShowAddModal(false)
    void fetchClients()
  }, [fetchClients])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="font-['Syne',sans-serif] text-[24px] font-extrabold text-foreground">
          {t('crm.title')}
        </h1>
        {!loading && (
          <p className="mt-1 text-[13px] text-muted-foreground">
            {clients.length} {t('crm.headerClients')} ·{' '}
            <span className="font-semibold text-green-600 dark:text-green-400">{activeCount} {t('crm.headerActive')}</span> ·{' '}
            <span className="font-semibold text-amber-600 dark:text-amber-400">{toFollowUpCount} {t('crm.headerToFollowUp')}</span>
          </p>
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
        <ClientDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          user={user}
        />
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <AddClientModal
          user={user}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleClientAdded}
        />
      )}
    </AppShell>
  )
}
