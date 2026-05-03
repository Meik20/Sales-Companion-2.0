'use client'

import { useState, useEffect, useCallback } from 'react'
import { colors } from '@/styles/tokens'

type Prospect = {
  id: string
  name: string
  phone?: string
  email?: string
  city?: string
  sector?: string
  notes?: string
  assignedTo?: string | null
  status?: string
  createdAt?: string
}

type TeamMember = {
  uid: string
  name?: string
  email?: string
}

type Props = {
  managerId: string
  members: TeamMember[]
  refreshTrigger?: number
}

const STATUS_COLOR: Record<string, string> = {
  new:         '#1E88E5',
  contacted:   '#FB8C00',
  in_progress: '#7B1FA2',
  converted:   '#43A047',
  lost:        '#E53935',
}
const STATUS_LABEL: Record<string, string> = {
  new:         'Nouveau',
  contacted:   'Contacté',
  in_progress: 'En cours',
  converted:   'Converti',
  lost:        'Perdu',
}

export function ManagerProspectsList({ managerId, members, refreshTrigger = 0 }: Props) {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [filterMember, setFilterMember] = useState('')
  const [assigning, setAssigning] = useState<string | null>(null)

  const loadProspects = useCallback(async () => {
    if (!managerId) return
    setLoading(true)
    try {
      const url = `/api/imports?managerId=${encodeURIComponent(managerId)}`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        setProspects(json.prospects ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [managerId])

  useEffect(() => { void loadProspects() }, [loadProspects, refreshTrigger])

  async function handleAssign(prospectId: string, memberId: string | null) {
    setAssigning(prospectId)
    try {
      await fetch('/api/imports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId, assignedTo: memberId, managerId }),
      })
      setProspects((prev) =>
        prev.map((p) => p.id === prospectId ? { ...p, assignedTo: memberId } : p)
      )
    } finally {
      setAssigning(null)
    }
  }

  // Filtrage local
  const filtered = prospects.filter((p) => {
    const term = search.toLowerCase()
    const matchSearch = !term
      || p.name.toLowerCase().includes(term)
      || (p.email ?? '').toLowerCase().includes(term)
      || (p.phone ?? '').toLowerCase().includes(term)
      || (p.city  ?? '').toLowerCase().includes(term)
      || (p.sector ?? '').toLowerCase().includes(term)
    const matchMember = !filterMember
      || p.assignedTo === filterMember
      || (filterMember === '__unassigned' && !p.assignedTo)
    return matchSearch && matchMember
  })

  function getMemberName(uid: string | null | undefined) {
    if (!uid) return '—'
    return members.find((m) => m.uid === uid)?.name ?? members.find((m) => m.uid === uid)?.email ?? uid
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Barre de filtres */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Rechercher un prospect…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 180, height: 36, padding: '0 12px',
            border: `1px solid ${colors.border}`, borderRadius: 8,
            fontSize: 13, fontFamily: 'inherit',
            background: colors.bg2, color: colors.text, outline: 'none',
          }}
        />
        <select
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
          style={{
            height: 36, padding: '0 10px',
            border: `1px solid ${colors.border}`, borderRadius: 8,
            fontSize: 12, fontFamily: 'inherit',
            background: colors.bg2, color: colors.text, outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">Tous les membres</option>
          <option value="__unassigned">Non assignés</option>
          {members.map((m) => (
            <option key={m.uid} value={m.uid}>{m.name ?? m.email}</option>
          ))}
        </select>
        <button
          onClick={() => void loadProspects()}
          style={{
            height: 36, padding: '0 12px',
            background: colors.greenLight, color: colors.green,
            border: `1px solid ${colors.successBorder}`, borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ↻
        </button>
      </div>

      {/* Compteur */}
      <div style={{ fontSize: 12, color: colors.textMid }}>
        {loading ? 'Chargement…' : `${filtered.length} prospect${filtered.length !== 1 ? 's' : ''} sur ${prospects.length}`}
      </div>

      {/* Table */}
      {!loading && filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: colors.textMid, fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          {prospects.length === 0
            ? 'Aucun prospect importé. Utilisez le bouton "Importer" ci-dessus.'
            : 'Aucun prospect correspond à votre recherche.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${colors.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: colors.bg3 }}>
                {['Nom', 'Téléphone', 'Email', 'Ville', 'Secteur', 'Statut', 'Assigné à'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '9px 12px',
                    color: colors.textMid, fontWeight: 600, fontSize: 11,
                    borderBottom: `1px solid ${colors.border}`,
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const statusColor = STATUS_COLOR[p.status ?? 'new'] ?? '#1E88E5'
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      background: i % 2 === 0 ? 'transparent' : colors.bg2,
                    }}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: colors.text }}>
                      {p.name || '—'}
                    </td>
                    <td style={{ padding: '9px 12px', color: colors.textMid }}>
                      {p.phone ? (
                        <a href={`tel:${p.phone}`} style={{ color: colors.green, textDecoration: 'none' }}>
                          {p.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '9px 12px', color: colors.textMid, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.email ? (
                        <a href={`mailto:${p.email}`} style={{ color: colors.green, textDecoration: 'none' }}>
                          {p.email}
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '9px 12px', color: colors.textMid }}>{p.city || '—'}</td>
                    <td style={{ padding: '9px 12px', color: colors.textMid }}>{p.sector || '—'}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                        background: `${statusColor}18`, color: statusColor,
                      }}>
                        {STATUS_LABEL[p.status ?? 'new'] ?? p.status}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      {assigning === p.id ? (
                        <span style={{ fontSize: 11, color: colors.textMid }}>⏳</span>
                      ) : (
                        <select
                          value={p.assignedTo ?? ''}
                          onChange={(e) => void handleAssign(p.id, e.target.value || null)}
                          style={{
                            height: 28, padding: '0 6px',
                            border: `1px solid ${colors.border}`, borderRadius: 6,
                            fontSize: 11, fontFamily: 'inherit',
                            background: colors.bg2, color: colors.text,
                            cursor: 'pointer', outline: 'none',
                            maxWidth: 140,
                          }}
                        >
                          <option value="">Non assigné</option>
                          {members.map((m) => (
                            <option key={m.uid} value={m.uid}>
                              {m.name ?? m.email}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
