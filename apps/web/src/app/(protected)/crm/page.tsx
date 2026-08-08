'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useState, useEffect, useCallback } from 'react'
import { ClientDrawer } from '@/features/crm/components/ClientDrawer'
import type { CrmClient } from '@/features/crm/types'

export default function CrmPage() {
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

  return (
    <AppShell>
      <PageHeader
        title="🎧 Mes Clients CRM"
        subtitle={`${clients.length} client${clients.length > 1 ? 's' : ''} conclu${clients.length > 1 ? 's' : ''} · Cliquez pour gérer`}
      />

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="🔍 Rechercher un client, ville, secteur…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 16px',
            borderRadius: 10,
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            background: 'var(--card, #131c2e)',
            color: 'var(--foreground, #f1f5f9)',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 200ms'
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border, rgba(255,255,255,0.1))' }}
        />
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total clients', value: clients.length, color: 'var(--color-accent)' },
          { label: 'Affichés', value: filtered.length, color: 'var(--color-success)' }
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--card, #131c2e)',
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            borderRadius: 10,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: "'Syne',sans-serif" }}>
              {stat.value}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted-foreground, #94a3b8)', fontSize: 14 }}>
          Chargement des clients…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          background: 'var(--card, #131c2e)', borderRadius: 16,
          border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`, color: 'var(--muted-foreground, #94a3b8)'
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎧</div>
          <p style={{ fontWeight: 700, color: 'var(--foreground, #f1f5f9)', margin: '0 0 4px' }}>
            {search ? 'Aucun résultat' : 'Aucun client conclu pour le moment'}
          </p>
          <p style={{ fontSize: 13, margin: 0 }}>
            {search ? 'Essayez un autre terme de recherche' : "Les clients conclus par l'équipe apparaîtront ici automatiquement."}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--card, #131c2e)',
          border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
          borderRadius: 14,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 130px 160px 120px 100px',
            padding: '10px 20px',
            borderBottom: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--muted-foreground, #94a3b8)',
            textTransform: 'uppercase',
            letterSpacing: '.06em'
          }}>
            <span>Entreprise</span>
            <span>Ville</span>
            <span>Secteur</span>
            <span>Téléphone</span>
            <span>Action</span>
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
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 130px 160px 120px 100px',
        padding: '14px 20px',
        borderBottom: isLast ? 'none' : `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
        cursor: 'pointer',
        background: isSelected
          ? 'rgba(55,138,221,0.08)'
          : hovered ? 'var(--secondary, #1e2a3b)' : 'transparent',
        transition: 'background 150ms',
        alignItems: 'center'
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--foreground, #f1f5f9)' }}>
          {client.companyName}
        </div>
        {client.companyEmail && (
          <div style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)', marginTop: 2 }}>
            {client.companyEmail}
          </div>
        )}
      </div>
      <span style={{ fontSize: 13, color: 'var(--muted-foreground, #94a3b8)' }}>{client.companyCity || '—'}</span>
      <span style={{ fontSize: 13, color: 'var(--muted-foreground, #94a3b8)' }}>{client.companySector || '—'}</span>
      <span style={{ fontSize: 13, color: 'var(--muted-foreground, #94a3b8)', fontFamily: 'monospace' }}>
        {client.companyPhone || '—'}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onSelect() }}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          background: isSelected ? 'var(--color-primary)' : 'transparent',
          border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border, rgba(255,255,255,0.1))'}`,
          color: isSelected ? '#fff' : 'var(--muted-foreground, #94a3b8)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 150ms'
        }}
      >
        {isSelected ? '✓ Ouvert' : 'Gérer →'}
      </button>
    </div>
  )
}
