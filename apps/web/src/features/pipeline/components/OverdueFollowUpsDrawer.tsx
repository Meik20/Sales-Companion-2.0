'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  X,
  AlertTriangle,
  Calendar,
  Building2,
  User,
  Phone,
  Mail,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Banknote,
  Users2,
  Crown,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getWhatsAppUrl } from '@/utils/whatsapp'
import type { OrgPipelineItem, OrgManagerStats } from '@/features/pipeline/hooks/useOrgPipeline'

interface OverdueFollowUpsDrawerProps {
  open: boolean
  onClose: () => void
  items: OrgPipelineItem[]
  currency?: string
  context?: 'org' | 'team'
  managers?: OrgManagerStats[]
}

interface OverdueLead {
  raw: OrgPipelineItem
  id: string
  companyName: string
  status: string
  amount: number
  currency: string
  dueDate: string // YYYY-MM-DD
  daysOverdue: number
  isToday: boolean
  nextAction: string
  memberName: string | null
  assignedTo: string | null
  managerName: string | null
  managerUid: string | null
  phone: string | null
  email: string | null
  city: string | null
  quarter: string | null
  sector: string | null
}

function parseDueDate(item: OrgPipelineItem): string | null {
  const raw =
    (item.nextFollowUp as string | undefined) ||
    (item.nextActionDate as string | undefined) ||
    (item.reminderDate as string | undefined)

  if (!raw) return null
  // Format YYYY-MM-DD
  if (typeof raw === 'string' && raw.length >= 10) {
    return raw.slice(0, 10)
  }
  return null
}

function calculateDaysDiff(dateStr: string, todayStr: string): number {
  const d1 = new Date(dateStr + 'T00:00:00')
  const d2 = new Date(todayStr + 'T00:00:00')
  const diffTime = d2.getTime() - d1.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

function formatFrenchDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d)
  } catch {
    return dateStr
  }
}

export function OverdueFollowUpsDrawer({
  open,
  onClose,
  items,
  currency = 'FCFA',
  context = 'org',
  managers
}: OverdueFollowUpsDrawerProps) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [search, setSearch] = useState('')
  const [selectedCommercial, setSelectedCommercial] = useState<string>('all')
  const [selectedManager, setSelectedManager] = useState<string>('all')
  const [tab, setTab] = useState<'overdue' | 'today' | 'all'>('overdue')
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({})

  // Fermer avec la touche Echap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Transformer les fiches en liste d'alertes
  const allAlertLeads = useMemo(() => {
    const list: OverdueLead[] = []

    for (const item of items) {
      const st = (item.status || '').toLowerCase().trim()
      // Ignorer les affaires gagnées/conclues
      if (['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(st)) {
        continue
      }

      const dueDate = parseDueDate(item)
      if (!dueDate) continue

      const days = calculateDaysDiff(dueDate, todayStr)
      const isOverdue = dueDate < todayStr
      const isToday = dueDate === todayStr

      if (!isOverdue && !isToday) continue

      const company =
        (item.companyName as string | undefined) ||
        (item.name as string | undefined) ||
        'Prospect sans nom'

      const member =
        (item.memberName as string | undefined) ||
        (item.assignedByName as string | undefined) ||
        null

      const phone =
        (item.phone as string | undefined) ||
        (item.companyPhone as string | undefined) ||
        null

      const email =
        (item.email as string | undefined) ||
        (item.companyEmail as string | undefined) ||
        null

      const city =
        (item.companyCity as string | undefined) ||
        (item.city as string | undefined) ||
        null

      const quarter =
        (item.companyQuarter as string | undefined) ||
        (item.quarter as string | undefined) ||
        null

      const sector =
        (item.companySector as string | undefined) ||
        (item.sector as string | undefined) ||
        null

      const action =
        (item.nextAction as string | undefined) ||
        (item.followUpType as string | undefined) ||
        'Relance commerciale'

      list.push({
        raw: item,
        id: item.id,
        companyName: company,
        status: st,
        amount: Number(item.amount) || 0,
        currency: (item.currency as string | undefined) || currency,
        dueDate,
        daysOverdue: Math.max(days, 0),
        isToday,
        nextAction: action,
        memberName: member,
        assignedTo: (item.assignedTo as string | undefined) || null,
        managerName: (item.managerName as string | undefined) || null,
        managerUid: (item.managerUid as string | undefined) || null,
        phone,
        email,
        city,
        quarter,
        sector
      })
    }

    // Trier par date d'échéance : les plus anciennes en premier (urgence maximale)
    list.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return list
  }, [items, todayStr, currency])

  // Filtrage selon l'onglet (overdue, today, all)
  const tabFilteredLeads = useMemo(() => {
    if (tab === 'overdue') {
      return allAlertLeads.filter((l) => !l.isToday)
    }
    if (tab === 'today') {
      return allAlertLeads.filter((l) => l.isToday)
    }
    return allAlertLeads
  }, [allAlertLeads, tab])

  // Liste des commerciaux uniques ayant des relances
  const availableCommercials = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>()
    let unassignedCount = 0

    for (const lead of allAlertLeads) {
      if (lead.assignedTo) {
        const key = lead.assignedTo
        const label = lead.memberName || `Commercial (${lead.assignedTo.slice(0, 6)})`
        const prev = map.get(key)
        if (prev) {
          prev.count++
        } else {
          map.set(key, { label, count: 1 })
        }
      } else {
        unassignedCount++
      }
    }

    return {
      commercials: Array.from(map.entries()).map(([id, val]) => ({ id, ...val })),
      unassignedCount
    }
  }, [allAlertLeads])

  // Liste des Team Managers uniques (vue organisation)
  const availableManagers = useMemo(() => {
    if (context !== 'org') return []
    const map = new Map<string, { label: string; count: number }>()

    for (const lead of allAlertLeads) {
      if (lead.managerUid) {
        const key = lead.managerUid
        const label = lead.managerName || `Manager (${lead.managerUid.slice(0, 6)})`
        const prev = map.get(key)
        if (prev) {
          prev.count++
        } else {
          map.set(key, { label, count: 1 })
        }
      }
    }

    return Array.from(map.entries()).map(([id, val]) => ({ id, ...val }))
  }, [allAlertLeads, context])

  // Application des filtres de recherche, commercial et manager
  const filteredLeads = useMemo(() => {
    let list = tabFilteredLeads

    // Filtre commercial
    if (selectedCommercial === 'unassigned') {
      list = list.filter((l) => !l.assignedTo)
    } else if (selectedCommercial !== 'all') {
      list = list.filter((l) => l.assignedTo === selectedCommercial)
    }

    // Filtre manager
    if (selectedManager !== 'all') {
      list = list.filter((l) => l.managerUid === selectedManager)
    }

    // Recherche texte
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((l) => {
        return (
          l.companyName.toLowerCase().includes(q) ||
          (l.memberName && l.memberName.toLowerCase().includes(q)) ||
          (l.managerName && l.managerName.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)) ||
          (l.nextAction && l.nextAction.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q))
        )
      })
    }

    return list
  }, [tabFilteredLeads, selectedCommercial, selectedManager, search])

  // ── GROUPEMENT PAR DATE D'ÉCHÉANCE (Pour gérer plusieurs leads le même jour) ──
  const groupedByDate = useMemo(() => {
    const groups: {
      date: string
      dateLabel: string
      daysOverdue: number
      isToday: boolean
      totalAmount: number
      leads: OverdueLead[]
    }[] = []

    const map = new Map<string, OverdueLead[]>()

    for (const lead of filteredLeads) {
      const arr = map.get(lead.dueDate) || []
      arr.push(lead)
      map.set(lead.dueDate, arr)
    }

    for (const [date, leads] of map.entries()) {
      const days = calculateDaysDiff(date, todayStr)
      const isToday = date === todayStr
      const totalAmount = leads.reduce((sum, l) => sum + l.amount, 0)

      groups.push({
        date,
        dateLabel: formatFrenchDate(date),
        daysOverdue: Math.max(days, 0),
        isToday,
        totalAmount,
        leads
      })
    }

    // Trier les groupes chronologiquement (les dates les plus anciennes en premier)
    groups.sort((a, b) => a.date.localeCompare(b.date))
    return groups
  }, [filteredLeads, todayStr])

  // Statistiques globales de l'alerte
  const stats = useMemo(() => {
    const overdueLeads = allAlertLeads.filter((l) => !l.isToday)
    const todayLeads = allAlertLeads.filter((l) => l.isToday)
    const totalAmount = allAlertLeads.reduce((acc, l) => acc + l.amount, 0)
    const distinctDates = new Set(allAlertLeads.map((l) => l.dueDate)).size
    const unassignedTotal = allAlertLeads.filter((l) => !l.assignedTo).length

    return {
      overdueCount: overdueLeads.length,
      todayCount: todayLeads.length,
      totalCount: allAlertLeads.length,
      totalAmount,
      distinctDates,
      unassignedTotal
    }
  }, [allAlertLeads])

  if (!open) return null

  const toggleDateCollapse = (date: string) => {
    setCollapsedDates((prev) => ({
      ...prev,
      [date]: !prev[date]
    }))
  }

  return (
    <>
      {/* ── Backdrop sombre avec flou glassmorphism ─────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          background: 'rgba(5, 10, 20, 0.65)',
          backdropFilter: 'blur(5px)',
          transition: 'opacity 200ms ease'
        }}
        aria-hidden="true"
      />

      {/* ── Slide-over Drawer Panel ─────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="overdue-drawer-title"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 1101,
          width: '100%',
          maxWidth: 680,
          background: 'var(--card, #131c2e)',
          borderLeft: '1px solid var(--border, rgba(255,255,255,0.1))',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.04) 100%)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(239,68,68,0.18)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  boxShadow: '0 2px 10px rgba(239,68,68,0.25)',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={20} strokeWidth={2.4} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2
                    id="overdue-drawer-title"
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 800,
                      color: 'var(--foreground, #f1f5f9)',
                      fontFamily: "'Syne', sans-serif"
                    }}
                  >
                    Alertes & Relances Échues
                  </h2>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: 'rgba(239,68,68,0.2)',
                      color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.35)'
                    }}
                  >
                    {stats.overdueCount} en retard
                  </span>
                  {context === 'org' && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: 20,
                        background: 'rgba(99,102,241,0.15)',
                        color: '#818cf8',
                        border: '1px solid rgba(99,102,241,0.3)'
                      }}
                    >
                      Vue Organisation
                    </span>
                  )}
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>
                  Suivi des opportunités nécessitant une action immédiate du commercial ou du manager.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le panneau"
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                background: 'var(--secondary, rgba(255,255,255,0.05))',
                color: 'var(--muted-foreground, #94a3b8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 150ms ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--foreground, #ffffff)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted-foreground, #94a3b8)'
                e.currentTarget.style.background = 'var(--secondary, rgba(255,255,255,0.05))'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Bandeau de synthèse des KPI ─────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 8,
              marginTop: 14
            }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '8px 10px'
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground, #94a3b8)', textTransform: 'uppercase' }}>
                Valeur en risque
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>
                {new Intl.NumberFormat('fr-FR').format(stats.totalAmount)} {currency}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '8px 10px'
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground, #94a3b8)', textTransform: 'uppercase' }}>
                Journées affectées
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
                {stats.distinctDates} {stats.distinctDates > 1 ? 'dates' : 'date'}
              </div>
            </div>

            {stats.unassignedTotal > 0 && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8,
                  padding: '8px 10px'
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                  Non assignés
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444', marginTop: 2 }}>
                  {stats.unassignedTotal} sans commercial
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Onglets & Filtres ───────────────────────────────────────────── */}
        <div
          style={{
            padding: '14px 22px',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
            background: 'var(--card, #131c2e)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          {/* Onglets : En retard / Aujourd'hui / Tous */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setTab('overdue')}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: tab === 'overdue' ? '1px solid #ef4444' : '1px solid var(--border, rgba(255,255,255,0.08))',
                background: tab === 'overdue' ? '#ef4444' : 'var(--secondary, rgba(255,255,255,0.04))',
                color: tab === 'overdue' ? '#ffffff' : 'var(--foreground, #f1f5f9)',
                transition: 'all 150ms ease'
              }}
            >
              <span>En retard</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: tab === 'overdue' ? 'rgba(0,0,0,0.25)' : 'rgba(239,68,68,0.2)',
                  color: tab === 'overdue' ? '#ffffff' : '#ef4444'
                }}
              >
                {stats.overdueCount}
              </span>
            </button>

            {stats.todayCount > 0 && (
              <button
                type="button"
                onClick={() => setTab('today')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: tab === 'today' ? '1px solid #3b82f6' : '1px solid var(--border, rgba(255,255,255,0.08))',
                  background: tab === 'today' ? '#3b82f6' : 'var(--secondary, rgba(255,255,255,0.04))',
                  color: tab === 'today' ? '#ffffff' : 'var(--foreground, #f1f5f9)',
                  transition: 'all 150ms ease'
                }}
              >
                <span>Aujourd'hui</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: tab === 'today' ? 'rgba(0,0,0,0.25)' : 'rgba(59,130,246,0.2)',
                    color: tab === 'today' ? '#ffffff' : '#60a5fa'
                  }}
                >
                  {stats.todayCount}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: tab === 'all' ? '1px solid #6366f1' : '1px solid var(--border, rgba(255,255,255,0.08))',
                background: tab === 'all' ? '#6366f1' : 'var(--secondary, rgba(255,255,255,0.04))',
                color: tab === 'all' ? '#ffffff' : 'var(--foreground, #f1f5f9)',
                transition: 'all 150ms ease'
              }}
            >
              <span>Toutes les alertes</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: tab === 'all' ? 'rgba(0,0,0,0.25)' : 'rgba(99,102,241,0.2)',
                  color: tab === 'all' ? '#ffffff' : '#818cf8'
                }}
              >
                {stats.totalCount}
              </span>
            </button>
          </div>

          {/* Recherche & Filtres Déroulants */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search
                size={14}
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
                placeholder="Rechercher prospect, commercial, téléphone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 10px 0 32px',
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  background: 'var(--background, rgba(0,0,0,0.2))',
                  color: 'var(--foreground, #f1f5f9)',
                  fontSize: 12.5,
                  outline: 'none'
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted-foreground)',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sélecteur Commercial */}
            <select
              value={selectedCommercial}
              onChange={(e) => setSelectedCommercial(e.target.value)}
              style={{
                height: 36,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                background: 'var(--secondary, rgba(255,255,255,0.05))',
                color: 'var(--foreground, #f1f5f9)',
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
                maxWidth: 180
              }}
            >
              <option value="all">Tous les commerciaux ({stats.totalCount})</option>
              {availableCommercials.unassignedCount > 0 && (
                <option value="unassigned">Non assignés ({availableCommercials.unassignedCount})</option>
              )}
              {availableCommercials.commercials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.count})
                </option>
              ))}
            </select>

            {/* Sélecteur Team Manager (si vue Organisation) */}
            {context === 'org' && availableManagers.length > 0 && (
              <select
                value={selectedManager}
                onChange={(e) => setSelectedManager(e.target.value)}
                style={{
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  background: 'var(--secondary, rgba(255,255,255,0.05))',
                  color: 'var(--foreground, #f1f5f9)',
                  fontSize: 12,
                  cursor: 'pointer',
                  outline: 'none',
                  maxWidth: 160
                }}
              >
                <option value="all">Toutes équipes</option>
                {availableManagers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.count})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ── Contenu Scrollable : Liste des Groupes par Date ────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {groupedByDate.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 16px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 12,
                border: '1px dashed var(--border, rgba(255,255,255,0.1))'
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto'
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--foreground)' }}>
                {search || selectedCommercial !== 'all' || selectedManager !== 'all'
                  ? 'Aucune relance ne correspond à ces filtres'
                  : 'Aucune relance en retard !'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0, maxWidth: 360, marginInline: 'auto' }}>
                {search || selectedCommercial !== 'all' || selectedManager !== 'all'
                  ? 'Essayez de réinitialiser la recherche ou de sélectionner tous les commerciaux.'
                  : 'Toutes les relances de votre pipeline sont à jour pour cette période.'}
              </p>
            </div>
          ) : (
            groupedByDate.map((group) => {
              const isCollapsed = Boolean(collapsedDates[group.date])

              return (
                <div
                  key={group.date}
                  style={{
                    background: 'var(--secondary, rgba(255,255,255,0.03))',
                    borderRadius: 12,
                    border: group.isToday
                      ? '1px solid rgba(59,130,246,0.3)'
                      : group.daysOverdue >= 3
                        ? '1px solid rgba(239,68,68,0.35)'
                        : '1px solid rgba(245,158,11,0.25)',
                    overflow: 'hidden'
                  }}
                >
                  {/* ── En-tête du Groupe Date (Plusieurs leads le même jour) ── */}
                  <div
                    onClick={() => toggleDateCollapse(group.date)}
                    style={{
                      padding: '10px 14px',
                      background: group.isToday
                        ? 'linear-gradient(90deg, rgba(59,130,246,0.12), transparent)'
                        : group.daysOverdue >= 3
                          ? 'linear-gradient(90deg, rgba(239,68,68,0.14), transparent)'
                          : 'linear-gradient(90deg, rgba(245,158,11,0.12), transparent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: isCollapsed
                        ? 'none'
                        : '1px solid var(--border, rgba(255,255,255,0.06))'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <Calendar
                        size={15}
                        style={{
                          color: group.isToday
                            ? '#60a5fa'
                            : group.daysOverdue >= 3
                              ? '#ef4444'
                              : '#f59e0b'
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: 'var(--foreground, #f1f5f9)',
                          textTransform: 'capitalize'
                        }}
                      >
                        {group.dateLabel}
                      </span>

                      {/* Badge de retard */}
                      {group.isToday ? (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: 'rgba(59,130,246,0.2)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59,130,246,0.35)'
                          }}
                        >
                          Aujourd'hui
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background:
                              group.daysOverdue >= 3
                                ? 'rgba(239,68,68,0.22)'
                                : 'rgba(245,158,11,0.2)',
                            color: group.daysOverdue >= 3 ? '#ef4444' : '#f59e0b',
                            border:
                              group.daysOverdue >= 3
                                ? '1px solid rgba(239,68,68,0.35)'
                                : '1px solid rgba(245,158,11,0.35)'
                          }}
                        >
                          {group.daysOverdue === 1
                            ? 'En retard de 1 jour'
                            : `En retard de ${group.daysOverdue} jours`}
                        </span>
                      )}

                      {/* Indicateur explicite du nombre de leads sur cette même date */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--muted-foreground, #94a3b8)',
                          background: 'rgba(255,255,255,0.06)',
                          padding: '1px 7px',
                          borderRadius: 8
                        }}
                      >
                        {group.leads.length} {group.leads.length > 1 ? 'leads prévus ce jour' : 'lead'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                        {new Intl.NumberFormat('fr-FR').format(group.totalAmount)} {currency}
                      </span>
                      <button
                        type="button"
                        aria-label={isCollapsed ? 'Déplier' : 'Replier'}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted-foreground)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* ── Liste des fiches pour cette date ────────────────────── */}
                  {!isCollapsed && (
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {group.leads.map((lead) => (
                        <div
                          key={lead.id}
                          style={{
                            background: 'var(--card, #131c2e)',
                            borderRadius: 10,
                            padding: '12px 14px',
                            border: '1px solid var(--border, rgba(255,255,255,0.07))',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 9
                          }}
                        >
                          {/* Ligne 1 : Nom de l'entreprise & Statut + Montant */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                <Building2 size={15} className="text-indigo-400" />
                                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground, #f1f5f9)' }}>
                                  {lead.companyName}
                                </span>
                                {(lead.city || lead.quarter) && (
                                  <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
                                    • {[lead.city, lead.quarter].filter(Boolean).join(', ')}
                                  </span>
                                )}
                              </div>
                              {lead.sector && (
                                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                                  Secteur : {lead.sector}
                                </div>
                              )}
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b' }}>
                                {lead.amount > 0
                                  ? `${new Intl.NumberFormat('fr-FR').format(lead.amount)} ${lead.currency}`
                                  : 'Montant non défini'}
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  display: 'inline-block',
                                  marginTop: 3,
                                  background:
                                    lead.status.includes('nego')
                                      ? 'rgba(245,158,11,0.15)'
                                      : 'rgba(59,130,246,0.15)',
                                  color: lead.status.includes('nego') ? '#f59e0b' : '#60a5fa'
                                }}
                              >
                                {lead.status}
                              </span>
                            </div>
                          </div>

                          {/* Ligne 2 : Commercial Assigné & Manager (Le cœur de la demande !) */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 8,
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: 'rgba(255,255,255,0.025)',
                              border: '1px solid rgba(255,255,255,0.05)'
                            }}
                          >
                            {/* Commercial responsable */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 6,
                                  background: lead.assignedTo
                                    ? 'rgba(99,102,241,0.2)'
                                    : 'rgba(239,68,68,0.2)',
                                  color: lead.assignedTo ? '#818cf8' : '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 11,
                                  fontWeight: 800
                                }}
                              >
                                <User size={13} />
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', fontWeight: 600 }}>
                                  Commercial en charge
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: lead.assignedTo ? 'var(--foreground)' : '#ef4444' }}>
                                  {lead.memberName || (lead.assignedTo ? `Membre (${lead.assignedTo.slice(0, 6)})` : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <AlertTriangle size={12} className="text-red-500 shrink-0" />
                                      <span>Non assigné (Action Requise)</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Team Manager de rattachement (si vue organisation) */}
                            {context === 'org' && lead.managerName && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Crown size={13} className="text-amber-400" />
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', fontWeight: 600 }}>
                                    Team Manager
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>
                                    {lead.managerName}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Ligne 3 : Action prévue et contacts directs */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--foreground)' }}>
                              <Clock size={13} className="text-rose-400 shrink-0" />
                              <span>
                                <strong>Action :</strong> {lead.nextAction}
                              </span>
                            </div>

                            {/* Boutons d'actions rapides (WhatsApp, Appel, Email) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {lead.phone && (
                                <>
                                  <a
                                    href={`tel:${lead.phone}`}
                                    title={`Appeler ${lead.phone}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                      background: 'rgba(59,130,246,0.12)',
                                      color: '#60a5fa',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      border: '1px solid rgba(59,130,246,0.25)'
                                    }}
                                  >
                                    <Phone size={11} />
                                    <span>Appeler</span>
                                  </a>

                                  <a
                                    href={getWhatsAppUrl(
                                      lead.phone,
                                      `Bonjour, je vous contacte concernant votre dossier ${lead.companyName} sur Sales Companion.`
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Contacter sur WhatsApp"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                      background: 'rgba(37,211,102,0.15)',
                                      color: '#25d366',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      border: '1px solid rgba(37,211,102,0.3)'
                                    }}
                                  >
                                    <MessageSquare size={11} />
                                    <span>WhatsApp</span>
                                  </a>
                                </>
                              )}

                              {lead.email && (
                                <a
                                  href={`mailto:${lead.email}?subject=${encodeURIComponent(`Suivi commercial - ${lead.companyName}`)}`}
                                  title={`Envoyer un email à ${lead.email}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    background: 'rgba(255,255,255,0.06)',
                                    color: 'var(--muted-foreground)',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    border: '1px solid var(--border, rgba(255,255,255,0.1))'
                                  }}
                                >
                                  <Mail size={11} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
            background: 'var(--card, #131c2e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
            Total : <strong>{filteredLeads.length}</strong> {filteredLeads.length > 1 ? 'alertes affichées' : 'alerte affichée'}
          </div>
          <Button variant="outline" size="sm" onClick={onClose} style={{ fontSize: 12 }}>
            Fermer
          </Button>
        </div>
      </div>
    </>
  )
}
