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
import { useTranslation } from '@/providers/I18nProvider'
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
  const { t } = useTranslation()
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
                      color: 'var(--foreground, #0f172a)',
                      fontFamily: "'Syne', sans-serif"
                    }}
                  >
                    {t('pipeline.overdueAlertsTitle')}
                  </h2>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: 'rgba(239,68,68,0.12)',
                      color: '#b91c1c',
                      border: '1px solid rgba(239,68,68,0.28)'
                    }}
                  >
                    {stats.overdueCount} {t('pipeline.overdueAlert')}
                  </span>
                  {context === 'org' && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: 'rgba(99,102,241,0.12)',
                        color: '#4338ca',
                        border: '1px solid rgba(99,102,241,0.28)'
                      }}
                    >
                      {t('pipeline.orgViewBadge')}
                    </span>
                  )}
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: 12, color: 'var(--muted-foreground, #64748b)' }}>
                  {t('pipeline.overdueAlertsSubtitle')}
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
                background: 'var(--card, #ffffff)',
                border: '1px solid var(--border, rgba(0,0,0,0.08))',
                borderRadius: 10,
                padding: '9px 12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('pipeline.valueAtRisk')}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#b45309', marginTop: 2 }}>
                {new Intl.NumberFormat('fr-FR').format(stats.totalAmount)} {currency}
              </div>
            </div>

            <div
              style={{
                background: 'var(--card, #ffffff)',
                border: '1px solid var(--border, rgba(0,0,0,0.08))',
                borderRadius: 10,
                padding: '9px 12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('pipeline.affectedDays')}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0369a1', marginTop: 2 }}>
                {stats.distinctDates} {stats.distinctDates > 1 ? 'dates' : 'date'}
              </div>
            </div>

            {stats.unassignedTotal > 0 && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 10,
                  padding: '9px 12px'
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('pipeline.unassignedLeads')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#b91c1c', marginTop: 2 }}>
                  {stats.unassignedTotal} {t('pipeline.withoutSalesperson')}
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
                border: tab === 'overdue' ? '1px solid #dc2626' : '1px solid var(--border, rgba(0,0,0,0.1))',
                background: tab === 'overdue' ? '#dc2626' : 'var(--card, #ffffff)',
                color: tab === 'overdue' ? '#ffffff' : 'var(--foreground, #0f172a)',
                transition: 'all 150ms ease'
              }}
            >
              <span>{t('pipeline.overdueAlert')}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: tab === 'overdue' ? 'rgba(0,0,0,0.25)' : 'rgba(239,68,68,0.12)',
                  color: tab === 'overdue' ? '#ffffff' : '#b91c1c'
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
                  border: tab === 'today' ? '1px solid #2563eb' : '1px solid var(--border, rgba(0,0,0,0.1))',
                  background: tab === 'today' ? '#2563eb' : 'var(--card, #ffffff)',
                  color: tab === 'today' ? '#ffffff' : 'var(--foreground, #0f172a)',
                  transition: 'all 150ms ease'
                }}
              >
                <span>{t('common.today')}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: tab === 'today' ? 'rgba(0,0,0,0.25)' : 'rgba(37,99,235,0.12)',
                    color: tab === 'today' ? '#ffffff' : '#1d4ed8'
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
                border: tab === 'all' ? '1px solid #4f46e5' : '1px solid var(--border, rgba(0,0,0,0.1))',
                background: tab === 'all' ? '#4f46e5' : 'var(--card, #ffffff)',
                color: tab === 'all' ? '#ffffff' : 'var(--foreground, #0f172a)',
                transition: 'all 150ms ease'
              }}
            >
              <span>{t('pipeline.allAlerts')}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: tab === 'all' ? 'rgba(0,0,0,0.25)' : 'rgba(99,102,241,0.12)',
                  color: tab === 'all' ? '#ffffff' : '#4338ca'
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
                placeholder={t('pipeline.searchOverduePlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 10px 0 32px',
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(0,0,0,0.12))',
                  background: 'var(--background, #ffffff)',
                  color: 'var(--foreground, #0f172a)',
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
                border: '1px solid var(--border, rgba(0,0,0,0.12))',
                background: 'var(--card, #ffffff)',
                color: 'var(--foreground, #0f172a)',
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
                maxWidth: 180
              }}
            >
              <option value="all">{t('pipeline.allCommercials')} ({stats.totalCount})</option>
              {availableCommercials.unassignedCount > 0 && (
                <option value="unassigned">{t('pipeline.unassignedLeads')} ({availableCommercials.unassignedCount})</option>
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
                  border: '1px solid var(--border, rgba(0,0,0,0.12))',
                  background: 'var(--card, #ffffff)',
                  color: 'var(--foreground, #0f172a)',
                  fontSize: 12,
                  cursor: 'pointer',
                  outline: 'none',
                  maxWidth: 160
                }}
              >
                <option value="all">{t('pipeline.allTeams')}</option>
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
                  ? t('pipeline.noOverdueMatchesFilters')
                  : t('pipeline.noOverdueCongrats')}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0, maxWidth: 360, marginInline: 'auto' }}>
                {search || selectedCommercial !== 'all' || selectedManager !== 'all'
                  ? t('pipeline.resetSearchHint')
                  : t('pipeline.allFollowUpsUpToDate')}
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
                        ? 'rgba(59,130,246,0.06)'
                        : group.daysOverdue >= 3
                          ? 'rgba(239,68,68,0.06)'
                          : 'rgba(245,158,11,0.07)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: isCollapsed
                        ? 'none'
                        : '1px solid var(--border, rgba(0,0,0,0.06))'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <Calendar
                        size={15}
                        style={{
                          color: group.isToday
                            ? '#2563eb'
                            : group.daysOverdue >= 3
                              ? '#dc2626'
                              : '#d97706'
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: 'var(--foreground, #0f172a)',
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
                            background: 'rgba(59,130,246,0.12)',
                            color: '#1d4ed8',
                            border: '1px solid rgba(59,130,246,0.28)'
                          }}
                        >
                          {t('common.today')}
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
                                ? 'rgba(239,68,68,0.12)'
                                : 'rgba(245,158,11,0.12)',
                            color: group.daysOverdue >= 3 ? '#b91c1c' : '#92400e',
                            border:
                              group.daysOverdue >= 3
                                ? '1px solid rgba(239,68,68,0.28)'
                                : '1px solid rgba(245,158,11,0.28)'
                          }}
                        >
                          {group.daysOverdue === 1
                            ? t('pipeline.overdueDaysCount_one')
                            : t('pipeline.overdueDaysCount_other').replace('{count}', String(group.daysOverdue))}
                        </span>
                      )}

                      {/* Indicateur explicite du nombre de leads sur cette même date */}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--foreground, #0f172a)',
                          background: 'var(--secondary, rgba(0,0,0,0.05))',
                          border: '1px solid var(--border, rgba(0,0,0,0.06))',
                          padding: '1px 7px',
                          borderRadius: 8
                        }}
                      >
                        {group.leads.length} {group.leads.length > 1 ? t('pipeline.leadsPlannedToday_other') : t('pipeline.leadsPlannedToday_one')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--foreground, #0f172a)' }}>
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
                            background: 'var(--card, #ffffff)',
                            borderRadius: 10,
                            padding: '12px 14px',
                            border: '1px solid var(--border, rgba(0,0,0,0.08))',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                          }}
                        >
                          {/* Ligne 1 : Nom de l'entreprise & Statut + Montant */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                <Building2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground, #0f172a)' }}>
                                  {lead.companyName}
                                </span>
                                {(lead.city || lead.quarter) && (
                                  <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
                                    • {[lead.city, lead.quarter].filter(Boolean).join(', ')}
                                  </span>
                                )}
                              </div>
                              {lead.sector && (
                                <div style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)', marginTop: 2 }}>
                                  Secteur : {lead.sector}
                                </div>
                              )}
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground, #0f172a)' }}>
                                {lead.amount > 0
                                  ? `${new Intl.NumberFormat('fr-FR').format(lead.amount)} ${lead.currency}`
                                  : 'Montant non défini'}
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  display: 'inline-block',
                                  marginTop: 3,
                                  background: lead.status.includes('nego')
                                    ? 'rgba(245,158,11,0.14)'
                                    : 'rgba(59,130,246,0.12)',
                                  color: lead.status.includes('nego') ? '#92400e' : '#1d4ed8',
                                  border: lead.status.includes('nego')
                                    ? '1px solid rgba(245,158,11,0.3)'
                                    : '1px solid rgba(59,130,246,0.3)'
                                }}
                              >
                                {lead.status}
                              </span>
                            </div>
                          </div>

                          {/* Ligne 2 : Commercial Assigné & Manager */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 8,
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: 'var(--secondary, rgba(0,0,0,0.03))',
                              border: '1px solid var(--border, rgba(0,0,0,0.06))'
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
                                    ? 'rgba(79,70,229,0.12)'
                                    : 'rgba(239,68,68,0.12)',
                                  color: lead.assignedTo ? '#4338ca' : '#b91c1c',
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
                                <div style={{ fontSize: 10, color: 'var(--muted-foreground, #64748b)', textTransform: 'uppercase', fontWeight: 600 }}>
                                  {t('pipeline.commercialInCharge')}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: lead.assignedTo ? 'var(--foreground, #0f172a)' : '#b91c1c' }}>
                                  {lead.memberName || (lead.assignedTo ? `Membre (${lead.assignedTo.slice(0, 6)})` : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <AlertTriangle size={12} className="text-red-600 shrink-0" />
                                      <span>{t('pipeline.unassignedActionRequired')}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Team Manager de rattachement (si vue organisation) */}
                            {context === 'org' && lead.managerName && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Crown size={13} className="text-amber-600 dark:text-amber-400" />
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--muted-foreground, #64748b)', textTransform: 'uppercase', fontWeight: 600 }}>
                                    Team Manager
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground, #0f172a)' }}>
                                    {lead.managerName}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Ligne 3 : Action prévue et contacts directs */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--foreground, #0f172a)' }}>
                              <Clock size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
                              <span>
                                <strong>{t('pipeline.actionLabel')}</strong> {lead.nextAction}
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
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      background: 'rgba(37,99,235,0.08)',
                                      color: '#1d4ed8',
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      border: '1px solid rgba(37,99,235,0.25)'
                                    }}
                                  >
                                    <Phone size={11} />
                                    <span>{t('pipeline.callBtn')}</span>
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
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      background: 'rgba(22,163,74,0.1)',
                                      color: '#15803d',
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      border: '1px solid rgba(22,163,74,0.28)'
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
                                    background: 'var(--secondary, rgba(0,0,0,0.04))',
                                    color: 'var(--foreground, #334155)',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    border: '1px solid var(--border, rgba(0,0,0,0.1))'
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
            Total : <strong>{filteredLeads.length}</strong> {filteredLeads.length > 1 ? t('pipeline.totalAlertsDisplayed_other') : t('pipeline.totalAlertsDisplayed_one')}
          </div>
          <Button variant="outline" size="sm" onClick={onClose} style={{ fontSize: 12 }}>
            {t('pipeline.closeBtn')}
          </Button>
        </div>
      </div>
    </>
  )
}
