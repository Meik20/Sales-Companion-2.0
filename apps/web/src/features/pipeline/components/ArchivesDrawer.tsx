'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Archive, RotateCcw, Search, Calendar, User, Building2, AlertTriangle } from 'lucide-react'
import { useArchivedLeads, useRestoreLeads } from '@/features/pipeline/hooks/useArchivePipeline'
import { useTranslation } from '@/providers/I18nProvider'
import { Button } from '@/components/ui/Button'

type ArchivedItem = {
  id: string
  companyName?: string
  status?: string
  memberName?: string
  assignedTo?: string
  archived?: boolean
  archivedAt?: any
  archivedBy?: string
  amount?: number
  currency?: string
  companyCity?: string
  companySector?: string
  nextFollowUp?: string
  createdAt?: any
}

function parseTimestampMs(value: any): number | null {
  if (!value) return null
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  if (value._seconds != null) return value._seconds * 1000
  if (value.seconds != null) return value.seconds * 1000
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

function formatDate(value: any, lang: string = 'fr'): string {
  const ts = parseTimestampMs(value)
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function normalizeStatus(s: string): string {
  const st = (s || '').toLowerCase().trim()
  if (['prospection', 'prospect'].includes(st)) return 'Prospection'
  if (['negociation', 'negotiation'].includes(st)) return 'Négociation'
  return 'Prospection'
}

const statusColor: Record<string, string> = {
  Prospection: '#60a5fa',
  Négociation: '#f59e0b'
}

// ── Archives Drawer ──────────────────────────────────────────────────────────
export function ArchivesDrawer() {
  const { t, lang } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterMonth, setFilterMonth] = useState<string>('') // 'YYYY-MM'

  const { items, loading, fetchArchived, refresh } = useArchivedLeads()
  const { restoreLeads, loading: restoring } = useRestoreLeads()

  // Charger les archives à chaque ouverture
  useEffect(() => {
    if (open) {
      void fetchArchived()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filtres
  const filtered = useMemo(() => {
    let list = items as ArchivedItem[]

    if (filterMonth) {
      list = list.filter((item) => {
        const ts = parseTimestampMs(item.archivedAt)
        if (!ts) return false
        const d = new Date(ts)
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return ym === filterMonth
      })
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (item) =>
          item.companyName?.toLowerCase().includes(q) ||
          item.memberName?.toLowerCase().includes(q) ||
          item.companyCity?.toLowerCase().includes(q)
      )
    }

    return list
  }, [items, search, filterMonth])

  // Mois disponibles pour le filtre
  const availableMonths = useMemo(() => {
    const months = new Map<string, string>()
    for (const item of items as ArchivedItem[]) {
      const ts = parseTimestampMs(item.archivedAt)
      if (!ts) continue
      const d = new Date(ts)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { month: 'long', year: 'numeric' })
      if (!months.has(key)) months.set(key, label)
    }
    return Array.from(months.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [items, lang])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)))
    }
  }

  async function handleRestore() {
    const ids = Array.from(selectedIds)
    await restoreLeads(ids)
    setSelectedIds(new Set())
    refresh()
  }

  // ── Trigger button ─────────────────────────────────────────────────────────
  const triggerButton = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 font-bold text-[13px] cursor-pointer transition-all hover:bg-amber-100 dark:hover:bg-amber-500/20 shadow-xs"
    >
      <Archive size={15} className="text-amber-700 dark:text-amber-400" />
      {t('pipeline.archivesTitle')}
      {items.length > 0 && (
        <span
          className="bg-amber-600 text-white rounded-full px-2 py-0.5 text-[10.5px] font-black"
        >
          {items.length}
        </span>
      )}
    </button>
  )

  if (!open) return triggerButton

  // ── Drawer ─────────────────────────────────────────────────────────────────
  return (
    <>
      {triggerButton}

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 1101,
          width: '100%',
          maxWidth: 640,
          background: 'var(--card, #131c2e)',
          borderLeft: '1px solid var(--border, rgba(255,255,255,0.08))',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
            background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.03) 100%)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(251,191,36,0.15)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Archive size={18} style={{ color: '#fbbf24' }} />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 800,
                    color: 'var(--foreground, #f1f5f9)',
                    fontFamily: "'Syne', sans-serif",
                    letterSpacing: '-0.02em'
                  }}
                >
                  {t('pipeline.archivesTitle')}
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>
                  {(items.length > 1 ? t('pipeline.archivesCount_other') : t('pipeline.archivesCount_one')).replace('{count}', String(items.length))}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: 'var(--secondary, #1e2a3b)',
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                borderRadius: 8,
                padding: 8,
                cursor: 'pointer',
                color: 'var(--muted-foreground, #94a3b8)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            flexShrink: 0
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted-foreground, #94a3b8)'
              }}
            />
            <input
              type="text"
              placeholder={t('pipeline.searchArchivesPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: 36,
                paddingLeft: 32,
                paddingRight: 12,
                borderRadius: 8,
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                background: 'var(--secondary, #1e2a3b)',
                color: 'var(--foreground, #f1f5f9)',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filters row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Month filter */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={{
                height: 32,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                background: 'var(--secondary, #1e2a3b)',
                color: 'var(--foreground, #f1f5f9)',
                fontSize: 12,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">{t('pipeline.allMonths')}</option>
              {availableMonths.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Sélect tout / désélect */}
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  background: 'var(--secondary, #1e2a3b)',
                  color: 'var(--foreground, #f1f5f9)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {selectedIds.size === filtered.length ? t('pipeline.deselectAll') : t('pipeline.selectAll')}
              </button>
            )}

            {/* Restaurer la sélection */}
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="primary"
                loading={restoring}
                onClick={() => void handleRestore()}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  height: 32,
                  fontSize: 12
                }}
              >
                <RotateCcw size={12} style={{ marginRight: 4 }} />
                {t('pipeline.restoreSelection').replace('{count}', String(selectedIds.size))}
              </Button>
            )}
          </div>

          {/* Résultat count */}
          {(search || filterMonth) && (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
              {t('pipeline.resultsCount').replace('{filtered}', String(filtered.length)).replace('{total}', String(items.length))}
            </p>
          )}
        </div>

        {/* ── Lead list ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted-foreground, #94a3b8)', fontSize: 13 }}>
              {t('pipeline.loadingArchives')}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                borderRadius: 12,
                border: '1px dashed var(--border, rgba(255,255,255,0.1))',
                background: 'var(--secondary, #1e2a3b)'
              }}
            >
              <Archive size={32} style={{ color: 'var(--muted-foreground, #94a3b8)', marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--foreground, #f1f5f9)' }}>
                {items.length === 0 ? t('pipeline.emptyArchivesTitle') : t('pipeline.emptyArchivesFilterTitle')}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>
                {items.length === 0
                  ? t('pipeline.emptyArchivesDesc')
                  : t('pipeline.emptyArchivesFilterDesc')}
              </p>
            </div>
          )}

          {!loading && filtered.map((item) => {
            const isSelected = selectedIds.has(item.id)
            const status = normalizeStatus(item.status || '')
            const color = statusColor[status] || '#94a3b8'

            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                style={{
                  borderRadius: 10,
                  border: isSelected
                    ? '1px solid rgba(251,191,36,0.5)'
                    : '1px solid var(--border, rgba(255,255,255,0.07))',
                  background: isSelected
                    ? 'rgba(251,191,36,0.06)'
                    : 'var(--secondary, #1e2a3b)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}
              >
                {/* Checkbox */}
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: isSelected ? '2px solid #fbbf24' : '2px solid rgba(255,255,255,0.2)',
                    background: isSelected ? '#fbbf24' : 'transparent',
                    flexShrink: 0,
                    marginTop: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 120ms'
                  }}
                >
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Company name + status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <Building2 size={13} style={{ color: 'var(--muted-foreground, #94a3b8)', flexShrink: 0 }} />
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'var(--foreground, #f1f5f9)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 200
                      }}
                    >
                      {item.companyName || '—'}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color,
                        background: `${color}18`,
                        border: `1px solid ${color}40`,
                        borderRadius: 4,
                        padding: '1px 6px'
                      }}
                    >
                      {status}
                    </span>
                    {item.amount ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#34d399' }}>
                        {new Intl.NumberFormat('fr-FR').format(item.amount)} FCFA
                      </span>
                    ) : null}
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
                    {item.memberName && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <User size={10} />
                        {item.memberName}
                      </span>
                    )}
                    {item.companyCity && (
                      <span>{item.companyCity}</span>
                    )}
                    {item.companySector && (
                      <span>{item.companySector}</span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={10} />
                      {t('pipeline.archivedOn')} {formatDate(item.archivedAt, lang)}
                    </span>
                    {item.nextFollowUp && item.nextFollowUp < new Date().toISOString().slice(0, 10) && (
                      <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <AlertTriangle size={10} />
                        {t('pipeline.overdueReminder')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border, rgba(255,255,255,0.06))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            background: 'var(--card, #131c2e)'
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
            {selectedIds.size > 0
              ? (selectedIds.size > 1 ? t('pipeline.selectedItemsCount_other') : t('pipeline.selectedItemsCount_one')).replace('{count}', String(selectedIds.size))
              : t('pipeline.clickToSelectHint')}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              background: 'var(--secondary, #1e2a3b)',
              color: 'var(--foreground, #f1f5f9)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {t('pipeline.closeDrawer')}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Archive Action Panel ─────────────────────────────────────────────────────
// Panneau de suggestion d'archivage — affiché dans le pipeline manager
// pour permettre une sélection manuelle avec bouton "Archiver la sélection"

export { ArchivesDrawer as default }
