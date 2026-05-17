'use client'

import { useState, useEffect, useCallback } from 'react'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

export type Prospect = {
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
  [key: string]: unknown
}

type TeamMember = {
  uid: string
  name?: string
  email?: string
  active?: boolean
}

type Props = {
  managerId: string
  members: TeamMember[]
  refreshTrigger?: number
  /** Called when the user clicks "Assigner la sélection" — passes selected prospects */
  onAssignSelection?: (prospects: Prospect[]) => void
}

const STATUS_COLOR: Record<string, string> = {
  new: '#1E88E5',
  contacted: '#FB8C00',
  in_progress: '#7B1FA2',
  converted: '#43A047',
  lost: '#E53935'
}

function getStatusLabel(status: string, t: any) {
  if (status === 'new') return t('team.statusNew')
  if (status === 'contacted') return t('team.statusContacted')
  if (status === 'in_progress') return t('team.statusInProgress')
  if (status === 'converted') return t('team.statusConverted')
  if (status === 'lost') return t('team.statusLost')
  return status
}

const SELECT_STYLE: React.CSSProperties = {
  height: 28,
  padding: '0 6px',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  fontSize: 11,
  fontFamily: 'inherit',
  background: colors.bg2,
  color: colors.text,
  cursor: 'pointer',
  outline: 'none',
  maxWidth: 150
}

export function ManagerProspectsList({
  managerId,
  members,
  refreshTrigger = 0,
  onAssignSelection
}: Props) {
  const { t } = useTranslation()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterMember, setFilterMember] = useState('')
  const [assigning, setAssigning] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Only active members can receive assignments
  const activeMembers = members.filter((m) => m.active !== false)

  const loadProspects = useCallback(async () => {
    if (!managerId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/imports?managerId=${encodeURIComponent(managerId)}`)
      if (res.ok) {
        const json = await res.json()
        setProspects(json.prospects ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [managerId])

  useEffect(() => {
    void loadProspects()
  }, [loadProspects, refreshTrigger])

  // Reset selection when data reloads
  useEffect(() => {
    setSelected(new Set())
  }, [refreshTrigger])

  async function handleAssign(prospectId: string, memberId: string | null) {
    setAssigning(prospectId)
    try {
      await fetch('/api/imports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId, assignedTo: memberId, managerId })
      })
      setProspects((prev) =>
        prev.map((p) => (p.id === prospectId ? { ...p, assignedTo: memberId } : p))
      )
    } finally {
      setAssigning(null)
    }
  }

  // Filtering
  const filtered = prospects.filter((p) => {
    const term = search.toLowerCase()
    const matchSearch =
      !term || Object.values(p).some((v) => v && String(v).toLowerCase().includes(term))
    const matchMember =
      !filterMember ||
      p.assignedTo === filterMember ||
      (filterMember === '__unassigned' && !p.assignedTo)
    return matchSearch && matchMember
  })

  // Selection helpers
  const allFilteredIds = filtered.map((p) => p.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id))
  const someSelected = allFilteredIds.some((id) => selected.has(id))
  const selectedProspects = prospects.filter((p) => selected.has(p.id))

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        allFilteredIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelected((prev) => new Set([...prev, ...allFilteredIds]))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function getMemberName(uid: string | null | undefined) {
    if (!uid) return '—'
    const m = members.find((m) => m.uid === uid)
    return m?.name ?? m?.email ?? uid
  }

  const checkboxStyle: React.CSSProperties = {
    width: 15,
    height: 15,
    cursor: 'pointer',
    accentColor: colors.green
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Barre de filtres ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder={t('team.searchProspect')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 180,
            height: 36,
            padding: '0 12px',
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'inherit',
            background: colors.bg2,
            color: colors.text,
            outline: 'none'
          }}
        />
        <select
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
          style={{
            height: 36,
            padding: '0 10px',
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'inherit',
            background: colors.bg2,
            color: colors.text,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="">{t('team.allMembers')}</option>
          <option value="__unassigned">{t('team.unassigned')}</option>
          {activeMembers.map((m) => (
            <option key={m.uid} value={m.uid}>
              {m.name ?? m.email}
            </option>
          ))}
        </select>
        <button
          onClick={() => void loadProspects()}
          title={t('team.refresh')}
          style={{
            height: 36,
            padding: '0 12px',
            background: colors.greenLight,
            color: colors.green,
            border: `1px solid ${colors.successBorder}`,
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          ↻
        </button>
      </div>

      {/* ── Compteur + action sélection ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        <span style={{ fontSize: 12, color: colors.textMid }}>
          {loading
            ? t('team.loading')
            : `${filtered.length} ${t('team.prospectsOn')} ${prospects.length}`}
          {someSelected && (
            <span style={{ marginLeft: 8, color: colors.green, fontWeight: 600 }}>
              · {selected.size} {t('team.selected')}
            </span>
          )}
        </span>

        {someSelected && onAssignSelection && (
          <button
            onClick={() => onAssignSelection(selectedProspects)}
            style={{
              height: 32,
              padding: '0 14px',
              background: colors.green,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {t('team.assignSelection')} ({selected.size})
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {!loading && filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: colors.textMid, fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          {prospects.length === 0 ? t('team.noProspectImported') : t('team.noProspectMatch')}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${colors.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: colors.bg3 }}>
                {/* Select-all checkbox */}
                <th
                  style={{
                    padding: '9px 12px',
                    width: 36,
                    textAlign: 'center',
                    borderBottom: `1px solid ${colors.border}`
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected
                    }}
                    onChange={toggleAll}
                    style={checkboxStyle}
                    title={t('team.selectAll')}
                  />
                </th>
                {[
                  t('field.raisonSociale'),
                  t('field.telephone'),
                  t('field.email'),
                  t('field.city'),
                  t('field.sector'),
                  t('pipeline.status'),
                  t('pipeline.assignedTo')
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '9px 12px',
                      color: colors.textMid,
                      fontWeight: 600,
                      fontSize: 11,
                      borderBottom: `1px solid ${colors.border}`,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const statusColor = STATUS_COLOR[p.status ?? 'new'] ?? '#1E88E5'
                const isSelected = selected.has(p.id)
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      background: isSelected
                        ? `${colors.green}12`
                        : i % 2 === 0
                          ? 'transparent'
                          : colors.bg2,
                      transition: 'background 150ms ease'
                    }}
                  >
                    {/* Row checkbox */}
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(p.id)}
                        style={checkboxStyle}
                      />
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: colors.text }}>
                      {p.name || '—'}
                    </td>
                    <td style={{ padding: '9px 12px', color: colors.textMid }}>
                      {p.phone ? (
                        <a
                          href={`tel:${p.phone}`}
                          style={{ color: colors.green, textDecoration: 'none' }}
                        >
                          {p.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        color: colors.textMid,
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {p.email ? (
                        <a
                          href={`mailto:${p.email}`}
                          style={{ color: colors.green, textDecoration: 'none' }}
                        >
                          {p.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '9px 12px', color: colors.textMid }}>{p.city || '—'}</td>
                    <td style={{ padding: '9px 12px', color: colors.textMid }}>
                      {p.sector || '—'}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: `${statusColor}18`,
                          color: statusColor
                        }}
                      >
                        {getStatusLabel(p.status ?? 'new', t)}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      {assigning === p.id ? (
                        <span style={{ fontSize: 11, color: colors.textMid }}>⏳</span>
                      ) : (
                        <select
                          value={p.assignedTo ?? ''}
                          onChange={(e) => void handleAssign(p.id, e.target.value || null)}
                          style={SELECT_STYLE}
                        >
                          <option value="">{t('team.notAssigned')}</option>
                          {activeMembers.map((m) => (
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
