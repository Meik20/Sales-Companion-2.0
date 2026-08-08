'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTranslation } from '@/providers/I18nProvider'
import { useState, useEffect, useCallback } from 'react'
import { ClientDrawer } from '@/features/crm/components/ClientDrawer'
import type { CrmClient } from '@/features/crm/types'

export default function CrmPage() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const [clients, setClients] = useState<CrmClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null)

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

  const filtered = clients.filter(c =>
    !search ||
    c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    c.companyCity?.toLowerCase().includes(search.toLowerCase()) ||
    c.companySector?.toLowerCase().includes(search.toLowerCase())
  )

  const subtitleText = `${clients.length} ${clients.length > 1 ? t('crm.subtitlePlural') : t('crm.subtitleSingular')}`

  return (
    <AppShell>
      <PageHeader
        title={t('crm.title')}
        subtitle={subtitleText}
      />

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder={t('crm.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-card px-4 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
        />
      </div>

      {/* Stats bar */}
      <div className="mb-5 flex flex-wrap gap-3">
        {[
          { label: t('crm.totalClients'), value: clients.length, color: 'var(--color-accent)' },
          { label: t('crm.displayed'), value: filtered.length, color: 'var(--color-success)' }
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5">
            <span className="font-['Syne',sans-serif] text-[22px] font-extrabold" style={{ color: stat.color }}>
              {stat.value}
            </span>
            <span className="text-[12px] text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-10 text-center text-[14px] text-muted-foreground">
          {t('crm.loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-14 text-center text-muted-foreground">
          <div className="mb-3 text-[40px]">🎧</div>
          <p className="mb-1 mt-0 text-[15px] font-bold text-foreground">
            {search ? t('crm.noResult') : t('crm.noClients')}
          </p>
          <p className="m-0 text-[13px]">
            {search ? t('crm.noResultDesc') : t('crm.noClientsDesc')}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Header */}
          <div className="grid grid-cols-[1fr_130px_160px_120px_100px] border-b border-border px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>{t('crm.colCompany')}</span>
            <span>{t('crm.colCity')}</span>
            <span>{t('crm.colSector')}</span>
            <span>{t('crm.colPhone')}</span>
            <span>{t('crm.colAction')}</span>
          </div>

          {/* Rows */}
          {filtered.map((client, idx) => (
            <ClientRow
              key={client.id}
              client={client}
              isLast={idx === filtered.length - 1}
              onSelect={() => setSelectedClient(client)}
              isSelected={selectedClient?.id === client.id}
            />
          ))}
        </div>
      )}

      {/* Drawer */}
      {selectedClient && (
        <ClientDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          user={user}
        />
      )}
    </AppShell>
  )
}

function ClientRow({
  client, isLast, onSelect, isSelected
}: {
  client: CrmClient
  isLast: boolean
  onSelect: () => void
  isSelected: boolean
}) {
  const { t } = useTranslation()
  return (
    <div
      onClick={onSelect}
      className={`grid cursor-pointer grid-cols-[1fr_130px_160px_120px_100px] items-center px-5 py-3.5 transition-colors duration-150 ${
        isLast ? '' : 'border-b border-border'
      } ${isSelected ? 'bg-primary/10' : 'hover:bg-secondary'}`}
    >
      <div>
        <div className="text-[13.5px] font-bold text-foreground">
          {client.companyName}
        </div>
        {client.companyEmail && (
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {client.companyEmail}
          </div>
        )}
      </div>
      <span className="text-[13px] text-muted-foreground">{client.companyCity || '—'}</span>
      <span className="text-[13px] text-muted-foreground">{client.companySector || '—'}</span>
      <span className="font-mono text-[13px] text-muted-foreground">
        {client.companyPhone || '—'}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onSelect() }}
        className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-150 ${
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground'
        }`}
      >
        {isSelected ? `✓ ${t('crm.open')}` : `${t('crm.manage')} →`}
      </button>
    </div>
  )
}
