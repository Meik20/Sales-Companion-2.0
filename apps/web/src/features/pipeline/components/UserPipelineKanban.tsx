'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useTranslation } from '@/providers/I18nProvider'
import {
  Building2,
  MapPin,
  Phone,
  MessageSquare,
  GripVertical,
  TrendingUp,
  Handshake,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Target,
  Trophy,
  Banknote,
  Calendar,
  AlertTriangle,
  Clock
} from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { getPipelineAging } from '@/lib/pipelineAging'
import { DeadlineBadge } from '@/components/ui/DeadlineBadge'
import { formatCompactAmount, formatFullAmount } from '@/lib/formatters'
import { useProspectingCountryDetails } from '@/hooks/useProspectingCountry'

type PipelineItem = {
  id: string
  companyName: string
  status: string
  companyCity?: string | null
  companyQuarter?: string | null
  companyRegion?: string | null
  quarter?: string | null
  region?: string | null
  companySector?: string | null
  companyPhone?: string | null
  companyEmail?: string | null
  phone?: string | null
  email?: string | null
  note?: string | null
  notes?: string | null
  amount?: number | null
  currency?: string | null
  assignedByName?: string | null
  managerUid?: string | null
  nextFollowUp?: string | null
  previousAssignees?: any[]
  transferDeadline?: string | null
  assignmentDeadline?: string | null
  firstActionAt?: string | null
  createdAt?: any
  updatedAt?: any
  assignedAt?: any
  enteredAt?: any
  concludedAt?: any
}

type Props = {
  items: PipelineItem[]
  onStatusChange: (id: string, status: 'prospection' | 'negociation' | 'conclue') => void
  onItemClick: (item: PipelineItem) => void
  activeStage?: 'prospection' | 'negociation' | 'conclue' | null
}

const COLUMNS = [
  {
    id: 'prospection',
    labelKey: 'pipeline.prospection',
    label: 'Prospection',
    color: '#60a5fa',
    gradient: 'linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(59,130,246,0.08) 100%)',
    border: 'rgba(96,165,250,0.25)',
    accent: '#60a5fa',
    icon: TrendingUp,
    emptyIcon: Target,
    emptyKey: 'pipeline.emptyProspection',
    emptyText: 'Aucune opportunité en cours'
  },
  {
    id: 'negociation',
    labelKey: 'pipeline.negotiation',
    label: 'Négociation',
    color: '#fb923c',
    gradient: 'linear-gradient(135deg, rgba(251,146,60,0.15) 0%, rgba(249,115,22,0.08) 100%)',
    border: 'rgba(251,146,60,0.25)',
    accent: '#fb923c',
    icon: Handshake,
    emptyIcon: Handshake,
    emptyKey: 'pipeline.emptyNegotiation',
    emptyText: 'Aucune négociation active'
  },
  {
    id: 'conclue',
    labelKey: 'pipeline.closed',
    label: 'Conclus',
    color: '#0284c7',
    gradient: 'linear-gradient(135deg, rgba(2,132,199,0.15) 0%, rgba(2,132,199,0.08) 100%)',
    border: 'rgba(2,132,199,0.25)',
    accent: '#0284c7',
    icon: CheckCircle2,
    emptyIcon: Trophy,
    emptyKey: 'pipeline.emptyConcluded',
    emptyText: 'Aucune vente conclue'
  }
]

const normalizeStatus = (status: string) => {
  if (['prospection', 'prospect'].includes(status)) return 'prospection'
  if (['negociation', 'negotiation'].includes(status)) return 'negociation'
  if (['conclue', 'conclusion'].includes(status)) return 'conclue'
  return 'prospection'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// ── Card component (shared between mobile & desktop) ─────────────────────────
function KanbanCard({
  item,
  col,
  onItemClick,
  onStatusChange,
  isMobile,
  dragHandleProps,
  draggableProps,
  innerRef,
  isDragging
}: {
  item: PipelineItem
  col: (typeof COLUMNS)[0]
  onItemClick: (item: PipelineItem) => void
  onStatusChange: (id: string, status: 'prospection' | 'negociation' | 'conclue') => void
  isMobile: boolean
  dragHandleProps?: any
  draggableProps?: any
  innerRef?: any
  isDragging?: boolean
}) {
  const { t, lang } = useTranslation()
  const { currency } = useProspectingCountryDetails()
  const otherCols = COLUMNS.filter((c) => c.id !== col.id)
  const aging = getPipelineAging(
    item.createdAt || item.enteredAt,
    item.status,
    item.assignedAt,
    item.updatedAt,
    lang
  )

  return (
    <div
      ref={innerRef}
      {...(draggableProps || {})}
      onClick={() => onItemClick(item)}
      className="transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-elevation-2"
      style={{
        marginBottom: 10,
        background: isDragging ? 'var(--bg3, #2d2e31)' : 'var(--card, #131c2e)',
        border: `1px solid ${isDragging ? col.accent : 'var(--border, rgba(255,255,255,0.08))'}`,
        borderLeft: `3.5px solid ${col.accent}`,
        borderRadius: 12,
        boxShadow: isDragging
          ? `var(--shadow-elevation-4), 0 0 0 1px ${col.accent}44`
          : 'var(--shadow-elevation-1)',
        cursor: 'pointer',
        overflow: 'hidden',
        ...(draggableProps?.style || {})
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Drag handle – desktop only */}
        {!isMobile && (
          <div
            {...(dragHandleProps || {})}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              flexShrink: 0,
              cursor: 'grab',
              color: 'var(--muted-foreground, #64748b)',
              opacity: 0.45,
              paddingLeft: 6
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} />
          </div>
        )}

        {/* Card body */}
        <div style={{ flex: 1, padding: isMobile ? '12px 12px 10px 12px' : '14px 14px 14px 8px' }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: `${col.accent}18`,
                border: `1px solid ${col.accent}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: col.accent,
                flexShrink: 0,
                fontFamily: 'var(--font-heading, sans-serif)',
                letterSpacing: '0.02em'
              }}
            >
              {getInitials(item.companyName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: 'var(--foreground, #f1f5f9)',
                  lineHeight: 1.3,
                  letterSpacing: '-0.015em',
                  fontFamily: 'var(--font-heading, sans-serif)',
                  wordBreak: 'break-word'
                }}
              >
                {item.companyName}
              </div>
              {item.companySector && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--muted-foreground, #94a3b8)',
                    marginTop: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Building2 size={10} style={{ opacity: 0.7 }} />
                  {item.companySector}
                </div>
              )}
            </div>
          </div>

          {/* Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {item.companyCity && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-muted-foreground bg-secondary/60 border border-border/80"
              >
                <MapPin size={11} className="opacity-70 text-muted-foreground shrink-0" />
                <span>{[item.companyQuarter || item.quarter, item.companyCity].filter(Boolean).join(', ') || item.companyCity}</span>
              </span>
            )}
            {item.amount != null && item.amount > 0 && (
              <span
                title={`${formatFullAmount(item.amount, lang)} ${currency || 'XAF'}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 shadow-elevation-0"
              >
                <Banknote size={11} className="shrink-0" />
                <span>{formatCompactAmount(item.amount, lang)} {currency || 'XAF'}</span>
              </span>
            )}
            {item.companyPhone && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/25 shadow-elevation-0"
              >
                <Phone size={11} className="shrink-0" />
                <span>{t('pipeline.phone')}</span>
              </span>
            )}
            {(item.notes ?? item.note) && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 shadow-elevation-0"
              >
                <MessageSquare size={11} className="shrink-0" />
                <span>{t('pipeline.hasNotes')}</span>
              </span>
            )}
            {item.nextFollowUp && item.status !== 'conclue' && item.status !== 'conclusion' && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-elevation-0 ${
                  item.nextFollowUp < new Date().toISOString().slice(0, 10)
                    ? 'text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/25'
                    : 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/25'
                }`}
              >
                <Calendar size={11} className="shrink-0" />
                <span>{item.nextFollowUp}</span>
              </span>
            )}
            {(() => {
              const filtered = (item.previousAssignees || []).filter(
                (pa: any) =>
                  !(item.managerUid && pa.userId === item.managerUid) &&
                  !(item.assignedByName && pa.memberName === item.assignedByName)
              )
              return filtered.length > 0 ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/25"
                >
                  <AlertTriangle size={11} className="shrink-0" />
                  <span>{t('pipeline.alreadyVisited')}</span>
                </span>
              ) : null
            })()}
            {/* Aging chip */}
            <span
              title={`${lang === 'en' ? 'Entered on' : 'Entré le'} ${aging.enteredDateFormatted} (${aging.relativeTimeFormatted})`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10.5,
                fontWeight: 700,
                color: aging.color,
                background: aging.bgColor,
                border: `1px solid ${aging.borderColor}`,
                borderRadius: 6,
                padding: '2px 7px'
              }}
            >
              <Clock size={10} />
              {aging.daysInPipeline === 0 ? t('common.today') : `${aging.daysInPipeline}${lang === 'en' ? 'd' : 'j'}`}
              {aging.level === 'alert' && (
                <AlertTriangle size={10} style={{ color: aging.color }} />
              )}
            </span>
            <DeadlineBadge
              deadline={item.assignmentDeadline}
              status={item.status}
              firstActionAt={item.firstActionAt}
            />
          </div>

          {/* Mobile: quick move buttons */}
          {isMobile && (
            <div
              style={{ display: 'flex', gap: 6, marginTop: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              {otherCols.map((targetCol) => (
                <button
                  key={targetCol.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(
                      item.id,
                      targetCol.id as 'prospection' | 'negociation' | 'conclue'
                    )
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    color: targetCol.accent,
                    background: `${targetCol.accent}12`,
                    border: `1px solid ${targetCol.accent}33`,
                    borderRadius: 6,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 150ms ease'
                  }}
                >
                  <ChevronRight size={10} />
                  {t(targetCol.labelKey) || targetCol.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Mobile Tab View ────────────────────────────────────────────────────────────
function MobileKanban({
  columns,
  onStatusChange,
  onItemClick,
  t,
  activeStage
}: {
  columns: Record<string, PipelineItem[]>
  onStatusChange: (id: string, status: 'prospection' | 'negociation' | 'conclue') => void
  onItemClick: (item: PipelineItem) => void
  t: (key: string) => string
  activeStage?: 'prospection' | 'negociation' | 'conclue' | null
}) {
  const [activeTab, setActiveTab] = useState<'prospection' | 'negociation' | 'conclue'>(
    (activeStage as any) || 'prospection'
  )
  const [mobilePages, setMobilePages] = useState<Record<string, number>>({})
  const [touchStart, setTouchStart] = useState<number | null>(null)

  useEffect(() => {
    if (activeStage && ['prospection', 'negociation', 'conclue'].includes(activeStage)) {
      setActiveTab(activeStage)
    }
  }, [activeStage])

  const colIndex = Math.max(0, COLUMNS.findIndex((c) => c.id === activeTab))
  const activeCol = (COLUMNS[colIndex] ?? COLUMNS[0])!
  const prevIndex = (colIndex - 1 + COLUMNS.length) % COLUMNS.length
  const nextIndex = (colIndex + 1) % COLUMNS.length
  const prevCol = (COLUMNS[prevIndex] ?? COLUMNS[0])!
  const nextCol = (COLUMNS[nextIndex] ?? COLUMNS[0])!

  const colItems = columns[activeTab] || []
  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(colItems.length / PAGE_SIZE))
  const currentPage = Math.min(mobilePages[activeTab] || 1, totalPages)
  const paginatedColItems = colItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0]
    if (touch) setTouchStart(touch.clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const touch = e.changedTouches[0]
    if (!touch) return
    const touchEnd = touch.clientX
    const diff = touchStart - touchEnd
    if (diff > 50) {
      setActiveTab(nextCol.id as any)
    } else if (diff < -50) {
      setActiveTab(prevCol.id as any)
    }
    setTouchStart(null)
  }

  const { currency } = useProspectingCountryDetails()
  const { lang } = useTranslation()
  const colAmount = colItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Active column header with step indicator and prev/next navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 14px',
          background: activeCol.gradient,
          border: `1px solid ${activeCol.border}`,
          borderRadius: '14px 14px 0 0',
          borderBottom: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
          <activeCol.icon size={16} color={activeCol.accent} strokeWidth={2.5} className="shrink-0" />
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: activeCol.color,
              fontFamily: "'Syne', sans-serif",
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap'
            }}
          >
            {t(activeCol.labelKey) || activeCol.label}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: activeCol.accent,
              background: `${activeCol.accent}22`,
              border: `1px solid ${activeCol.accent}44`,
              borderRadius: 6,
              padding: '1px 6px'
            }}
          >
            {colItems.length}
          </span>
          {colAmount > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: activeCol.color,
                background: `${activeCol.accent}15`,
                border: `1px solid ${activeCol.accent}33`,
                borderRadius: 6,
                padding: '1px 6px',
                whiteSpace: 'nowrap'
              }}
              title={`${formatFullAmount(colAmount, lang)} ${currency || 'XAF'}`}
            >
              {formatCompactAmount(colAmount, lang)} {currency || 'XAF'}
            </span>
          )}
        </div>

        {/* Mini dot indicators & navigation arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {COLUMNS.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveTab(c.id as any)}
                aria-label={c.label}
                style={{
                  width: idx === colIndex ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: idx === colIndex ? activeCol.accent : 'var(--muted-foreground, #64748b)',
                  opacity: idx === colIndex ? 1 : 0.35,
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 200ms ease'
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 4 }}>
            <button
              type="button"
              onClick={() => setActiveTab(prevCol.id as any)}
              aria-label="Étape précédente"
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: 'var(--secondary, #1e2a3b)',
                border: `1px solid ${activeCol.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeCol.color,
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(nextCol.id as any)}
              aria-label="Étape suivante"
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: 'var(--secondary, #1e2a3b)',
                border: `1px solid ${activeCol.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeCol.color,
                cursor: 'pointer'
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Cards area with touch swipe */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          background: 'var(--card, #131c2e)',
          border: `1px solid ${activeCol.border}`,
          borderRadius: '0 0 14px 14px',
          padding: 12,
          minHeight: 200
        }}
      >
        {paginatedColItems.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '32px 16px',
              opacity: 0.5,
              border: `1.5px dashed ${activeCol.accent}44`,
              borderRadius: 12
            }}
          >
            {(() => {
              const EmptyIcon = activeCol.emptyIcon
              return <EmptyIcon size={32} color={activeCol.accent} strokeWidth={1.5} />
            })()}
            <span
              style={{ fontSize: 13, fontWeight: 600, color: activeCol.color, textAlign: 'center' }}
            >
              {t((activeCol as any).emptyKey) || activeCol.emptyText}
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--muted-foreground, #64748b)',
                textAlign: 'center'
              }}
            >
              {t('pipeline.kanbanMoveHint') ||
                'Utilisez les boutons sur les cartes pour déplacer vos opportunités'}
            </span>
          </div>
        ) : (
          paginatedColItems.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              col={activeCol}
              onItemClick={onItemClick}
              onStatusChange={onStatusChange}
              isMobile={true}
            />
          ))
        )}

        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
              padding: '8px 10px',
              borderRadius: 8,
              background: 'var(--secondary, #1e2a3b)',
              border: '1px solid var(--border, rgba(255,255,255,0.08))'
            }}
          >
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() =>
                setMobilePages((prev) => ({
                  ...prev,
                  [activeTab]: Math.max(1, currentPage - 1)
                }))
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                background: 'transparent',
                color: currentPage <= 1 ? 'var(--muted-foreground, #64748b)' : 'var(--foreground, #f1f5f9)',
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage <= 1 ? 0.45 : 1
              }}
            >
              <ChevronLeft size={13} />
            </button>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)', fontWeight: 600 }}>
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setMobilePages((prev) => ({
                  ...prev,
                  [activeTab]: Math.min(totalPages, currentPage + 1)
                }))
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                background: 'transparent',
                color: currentPage >= totalPages ? 'var(--muted-foreground, #64748b)' : 'var(--foreground, #f1f5f9)',
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage >= totalPages ? 0.45 : 1
              }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export function UserPipelineKanban({ items, onStatusChange, onItemClick, activeStage }: Props) {
  const { t, lang } = useTranslation()
  const { currency } = useProspectingCountryDetails()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [columns, setColumns] = useState<Record<string, PipelineItem[]>>({
    prospection: [],
    negociation: [],
    conclue: []
  })
  const [columnPages, setColumnPages] = useState<Record<string, number>>({})
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const newCols: Record<string, PipelineItem[]> = {
      prospection: [],
      negociation: [],
      conclue: []
    }
    items.forEach((item) => {
      const status = normalizeStatus(item.status)
      if (newCols[status]) newCols[status].push(item)
    })
    setColumns(newCols)
  }, [items])

  if (!isMounted) return <div style={{ minHeight: 400 }} />

  // ── Mobile view: tabs ──────────────────────────────────────────────────────
  if (!isDesktop) {
    return (
      <MobileKanban
        columns={columns}
        onStatusChange={onStatusChange}
        onItemClick={onItemClick}
        t={t}
        activeStage={activeStage}
      />
    )
  }

  // ── Desktop view: drag-and-drop Kanban ────────────────────────────────────
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const PAGE_SIZE = 10
    const startColId = source.droppableId
    const finishColId = destination.droppableId
    const srcPage = columnPages[startColId] || 1
    const destPage = columnPages[finishColId] || 1
    const realSourceIndex = (srcPage - 1) * PAGE_SIZE + source.index
    const realDestIndex = (destPage - 1) * PAGE_SIZE + destination.index

    const startItems = Array.from(columns[startColId] || [])
    const finishItems =
      startColId === finishColId ? startItems : Array.from(columns[finishColId] || [])
    const [movedItem] = startItems.splice(realSourceIndex, 1)
    if (!movedItem) return

    if (startColId === finishColId) {
      startItems.splice(realDestIndex, 0, movedItem)
      setColumns({ ...columns, [startColId]: startItems })
    } else {
      movedItem.status = finishColId
      finishItems.splice(realDestIndex, 0, movedItem)
      setColumns({ ...columns, [startColId]: startItems, [finishColId]: finishItems })
      onStatusChange(draggableId, finishColId as 'prospection' | 'negociation' | 'conclue')
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          overflowX: 'auto',
          paddingBottom: 16,
          minHeight: 600
        }}
      >
        {COLUMNS.map((col) => {
          const colItems = columns[col.id] || []
          const colAmount = colItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
          const ColIcon = col.icon
          const PAGE_SIZE = 10
          const totalPages = Math.max(1, Math.ceil(colItems.length / PAGE_SIZE))
          const currentPage = Math.min(columnPages[col.id] || 1, totalPages)
          const paginatedColItems = colItems.slice(
            (currentPage - 1) * PAGE_SIZE,
            currentPage * PAGE_SIZE
          )

          return (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl overflow-hidden border border-border/80 shadow-elevation-1 transition-all duration-200"
              style={{
                background: 'var(--secondary, rgba(0,0,0,0.02))'
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '14px 18px',
                  background: col.gradient,
                  borderBottom: `1px solid ${col.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: `${col.accent}22`,
                      border: `1px solid ${col.accent}44`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ColIcon size={16} color={col.accent} strokeWidth={2.5} />
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: col.color,
                      letterSpacing: '-0.015em',
                      fontFamily: 'var(--font-heading, sans-serif)'
                    }}
                  >
                    {t(col.labelKey)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {colAmount > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: col.color,
                        background: `${col.accent}15`,
                        border: `1px solid ${col.accent}33`,
                        borderRadius: 6,
                        padding: '2px 7px',
                        whiteSpace: 'nowrap'
                      }}
                      title={`${formatFullAmount(colAmount, lang)} ${currency || 'XAF'}`}
                    >
                      {formatCompactAmount(colAmount, lang)} {currency || 'XAF'}
                    </span>
                  )}
                  {totalPages > 1 && (
                    <span style={{ fontSize: 11, color: col.color, fontWeight: 700, opacity: 0.85 }}>
                      {currentPage}/{totalPages}
                    </span>
                  )}
                  <div
                    style={{
                      minWidth: 26,
                      height: 26,
                      borderRadius: 8,
                      background: `${col.accent}22`,
                      border: `1px solid ${col.accent}44`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 800,
                      color: col.accent,
                      padding: '0 6px'
                    }}
                  >
                    {colItems.length}
                  </div>
                </div>
              </div>

              {/* Droppable */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      padding: 14,
                      flexGrow: 1,
                      minHeight: 200,
                      transition: 'background-color 0.2s ease',
                      backgroundColor: snapshot.isDraggingOver ? `${col.accent}08` : 'transparent',
                      borderRadius: totalPages > 1 ? '0' : '0 0 20px 20px'
                    }}
                  >
                    {paginatedColItems.length === 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '32px 16px',
                          opacity: 0.45,
                          borderRadius: 14,
                          border: `1.5px dashed ${col.accent}44`,
                          marginTop: 4
                        }}
                      >
                        {(() => {
                          const EmptyIcon = col.emptyIcon
                          return <EmptyIcon size={28} color={col.accent} strokeWidth={1.5} />
                        })()}
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: col.color,
                            textAlign: 'center'
                          }}
                        >
                          {t((col as any).emptyKey) || col.emptyText}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--muted-foreground, #64748b)',
                            textAlign: 'center'
                          }}
                        >
                          {t('pipeline.dragProspectHere') || 'Glissez une opportunité ici'}
                        </span>
                      </div>
                    ) : (
                      paginatedColItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <KanbanCard
                              item={item}
                              col={col}
                              onItemClick={onItemClick}
                              onStatusChange={onStatusChange}
                              isMobile={false}
                              dragHandleProps={provided.dragHandleProps}
                              draggableProps={provided.draggableProps}
                              innerRef={provided.innerRef}
                              isDragging={snapshot.isDragging}
                            />
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Column pagination footer */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderTop: `1px solid ${col.border}`,
                    background: 'var(--card, #131c2e)'
                  }}
                >
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setColumnPages((prev) => ({
                        ...prev,
                        [col.id]: Math.max(1, currentPage - 1)
                      }))
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 6,
                      background: 'transparent',
                      color: currentPage <= 1 ? 'var(--muted-foreground, #64748b)' : 'var(--foreground, #f1f5f9)',
                      border: '1px solid var(--border, rgba(255,255,255,0.1))',
                      cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage <= 1 ? 0.45 : 1
                    }}
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)', fontWeight: 600 }}>
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setColumnPages((prev) => ({
                        ...prev,
                        [col.id]: Math.min(totalPages, currentPage + 1)
                      }))
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 6,
                      background: 'transparent',
                      color: currentPage >= totalPages ? 'var(--muted-foreground, #64748b)' : 'var(--foreground, #f1f5f9)',
                      border: '1px solid var(--border, rgba(255,255,255,0.1))',
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage >= totalPages ? 0.45 : 1
                    }}
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
