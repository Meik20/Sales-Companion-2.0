'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'
import { Building2, MapPin, Phone, MessageSquare, GripVertical, TrendingUp, Handshake, CheckCircle2, ChevronRight } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

type PipelineItem = {
  id: string
  companyName: string
  status: string
  companyCity?: string | null
  companySector?: string | null
  companyPhone?: string | null
  companyEmail?: string | null
  note?: string | null
  notes?: string | null
  assignedByName?: string | null
  previousAssignees?: any[]
}

type Props = {
  items: PipelineItem[]
  onStatusChange: (id: string, status: 'prospection' | 'negociation' | 'conclue') => void
  onItemClick: (item: PipelineItem) => void
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
    emptyIcon: '🎯',
    emptyText: 'Aucun prospect en cours'
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
    emptyIcon: '🤝',
    emptyText: 'Aucune négociation active'
  },
  {
    id: 'conclue',
    labelKey: 'pipeline.closed',
    label: 'Conclus',
    color: '#4ade80',
    gradient: 'linear-gradient(135deg, rgba(74,222,128,0.15) 0%, rgba(34,197,94,0.08) 100%)',
    border: 'rgba(74,222,128,0.25)',
    accent: '#4ade80',
    icon: CheckCircle2,
    emptyIcon: '🏆',
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
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
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
  col: typeof COLUMNS[0]
  onItemClick: (item: PipelineItem) => void
  onStatusChange: (id: string, status: 'prospection' | 'negociation' | 'conclue') => void
  isMobile: boolean
  dragHandleProps?: any
  draggableProps?: any
  innerRef?: any
  isDragging?: boolean
}) {
  const otherCols = COLUMNS.filter(c => c.id !== col.id)

  return (
    <div
      ref={innerRef}
      {...(draggableProps || {})}
      onClick={() => onItemClick(item)}
      style={{
        marginBottom: 10,
        background: isDragging ? colors.bg4 : colors.bg3,
        border: `1px solid ${isDragging ? col.accent : colors.border}`,
        borderLeft: `3px solid ${col.accent}`,
        borderRadius: 14,
        boxShadow: isDragging
          ? `0 12px 40px rgba(0,0,0,0.25), 0 0 0 1px ${col.accent}44`
          : '0 2px 8px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'box-shadow 200ms ease, border-color 200ms ease',
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
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, flexShrink: 0, cursor: 'grab',
              color: colors.textDim, opacity: 0.4, paddingLeft: 6
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
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: `${col.accent}18`, border: `1px solid ${col.accent}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: col.accent, flexShrink: 0,
              fontFamily: "'Syne', sans-serif", letterSpacing: '0.02em'
            }}>
              {getInitials(item.companyName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 800, color: colors.text,
                lineHeight: 1.3, letterSpacing: '-0.01em',
                fontFamily: "'Syne', sans-serif", wordBreak: 'break-word'
              }}>
                {item.companyName}
              </div>
              {item.companySector && (
                <div style={{
                  fontSize: 11, color: colors.textMid, marginTop: 2,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <Building2 size={10} style={{ opacity: 0.7 }} />
                  {item.companySector}
                </div>
              )}
            </div>
          </div>

          {/* Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {item.companyCity && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, color: colors.textMid,
                background: colors.bg2, border: `1px solid ${colors.border}`,
                borderRadius: 6, padding: '2px 8px'
              }}>
                <MapPin size={10} style={{ opacity: 0.7 }} />{item.companyCity}
              </span>
            )}
            {item.companyPhone && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, color: '#22c55e',
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 6, padding: '2px 8px'
              }}>
                <Phone size={10} />Tél
              </span>
            )}
            {(item.notes ?? item.note) && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, color: '#fbbf24',
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 6, padding: '2px 8px'
              }}>
                <MessageSquare size={10} />Notes
              </span>
            )}
            {item.previousAssignees && item.previousAssignees.length > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, color: '#f87171',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 6, padding: '2px 8px'
              }}>
                ⚠️ Déjà visité
              </span>
            )}
          </div>

          {/* Mobile: quick move buttons */}
          {isMobile && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
              {otherCols.map(targetCol => (
                <button
                  key={targetCol.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(item.id, targetCol.id as 'prospection' | 'negociation' | 'conclue')
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 10, fontWeight: 700, color: targetCol.accent,
                    background: `${targetCol.accent}12`, border: `1px solid ${targetCol.accent}33`,
                    borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'all 150ms ease'
                  }}
                >
                  <ChevronRight size={10} />
                  {targetCol.label}
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
  t
}: {
  columns: Record<string, PipelineItem[]>
  onStatusChange: (id: string, status: 'prospection' | 'negociation' | 'conclue') => void
  onItemClick: (item: PipelineItem) => void
  t: (key: string) => string
}) {
  const [activeTab, setActiveTab] = useState('prospection')
  const activeCol = COLUMNS.find(c => c.id === activeTab)!
  const colItems = columns[activeTab] || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        background: colors.bg2,
        borderRadius: 14,
        padding: 4,
        gap: 4,
        border: `1px solid ${colors.border}`,
        marginBottom: 16
      }}>
        {COLUMNS.map(col => {
          const ColIcon = col.icon
          const count = (columns[col.id] || []).length
          const isActive = activeTab === col.id
          return (
            <button
              key={col.id}
              onClick={() => setActiveTab(col.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 4px',
                borderRadius: 10,
                border: 'none',
                background: isActive ? col.gradient : 'transparent',
                boxShadow: isActive ? `0 0 0 1.5px ${col.accent}55, 0 4px 12px rgba(0,0,0,0.08)` : 'none',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                fontFamily: 'inherit'
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${col.accent}22`,
                border: `1px solid ${col.accent}${isActive ? '66' : '33'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ColIcon size={14} color={col.accent} strokeWidth={2.5} />
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, color: isActive ? col.color : colors.textMid,
                lineHeight: 1, fontFamily: "'Syne', sans-serif"
              }}>
                {col.label}
              </span>
              <div style={{
                minWidth: 20, height: 18, borderRadius: 6,
                background: isActive ? `${col.accent}33` : colors.bg3,
                border: `1px solid ${isActive ? col.accent + '44' : colors.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: isActive ? col.accent : colors.textDim,
                padding: '0 5px'
              }}>
                {count}
              </div>
            </button>
          )
        })}
      </div>

      {/* Active column header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        background: activeCol.gradient,
        border: `1px solid ${activeCol.border}`,
        borderRadius: '12px 12px 0 0',
        borderBottom: 'none'
      }}>
        <activeCol.icon size={16} color={activeCol.accent} strokeWidth={2.5} />
        <span style={{
          fontSize: 13, fontWeight: 800, color: activeCol.color,
          fontFamily: "'Syne', sans-serif", letterSpacing: '-0.01em'
        }}>
          {activeCol.label}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 12, fontWeight: 700, color: activeCol.accent,
          background: `${activeCol.accent}22`,
          border: `1px solid ${activeCol.accent}44`,
          borderRadius: 6, padding: '2px 8px'
        }}>
          {colItems.length}
        </span>
      </div>

      {/* Cards area */}
      <div style={{
        background: colors.bg2,
        border: `1px solid ${activeCol.border}`,
        borderRadius: '0 0 14px 14px',
        padding: 12,
        minHeight: 200
      }}>
        {colItems.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '32px 16px', opacity: 0.5,
            border: `1.5px dashed ${activeCol.accent}44`,
            borderRadius: 12
          }}>
            <span style={{ fontSize: 32 }}>{activeCol.emptyIcon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: activeCol.color, textAlign: 'center' }}>
              {activeCol.emptyText}
            </span>
            <span style={{ fontSize: 11, color: colors.textDim, textAlign: 'center' }}>
              Utilisez les boutons sur les cartes pour déplacer vos prospects
            </span>
          </div>
        ) : (
          colItems.map(item => (
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
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export function UserPipelineKanban({ items, onStatusChange, onItemClick }: Props) {
  const { t } = useTranslation()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [columns, setColumns] = useState<Record<string, PipelineItem[]>>({
    prospection: [], negociation: [], conclue: []
  })
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const newCols: Record<string, PipelineItem[]> = { prospection: [], negociation: [], conclue: [] }
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
      />
    )
  }

  // ── Desktop view: drag-and-drop Kanban ────────────────────────────────────
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const startColId = source.droppableId
    const finishColId = destination.droppableId
    const startItems = Array.from(columns[startColId] || [])
    const finishItems = startColId === finishColId ? startItems : Array.from(columns[finishColId] || [])
    const [movedItem] = startItems.splice(source.index, 1)
    if (!movedItem) return

    if (startColId === finishColId) {
      startItems.splice(destination.index, 0, movedItem)
      setColumns({ ...columns, [startColId]: startItems })
    } else {
      movedItem.status = finishColId
      finishItems.splice(destination.index, 0, movedItem)
      setColumns({ ...columns, [startColId]: startItems, [finishColId]: finishItems })
      onStatusChange(draggableId, finishColId as 'prospection' | 'negociation' | 'conclue')
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
        overflowX: 'auto',
        paddingBottom: 16,
        minHeight: 600
      }}>
        {COLUMNS.map((col) => {
          const colItems = columns[col.id] || []
          const ColIcon = col.icon
          return (
            <div key={col.id} style={{
              display: 'flex', flexDirection: 'column',
              background: colors.bg2,
              border: `1px solid ${col.border}`,
              borderRadius: 20, overflow: 'hidden',
              boxShadow: `0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)`
            }}>
              {/* Column Header */}
              <div style={{
                padding: '18px 20px 16px',
                background: col.gradient,
                borderBottom: `1px solid ${col.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: `${col.accent}22`, border: `1px solid ${col.accent}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <ColIcon size={16} color={col.accent} strokeWidth={2.5} />
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: 800, color: col.color,
                    letterSpacing: '-0.01em', fontFamily: "'Syne', sans-serif"
                  }}>
                    {t(col.labelKey)}
                  </span>
                </div>
                <div style={{
                  minWidth: 26, height: 26, borderRadius: 8,
                  background: `${col.accent}22`, border: `1px solid ${col.accent}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: col.accent, padding: '0 6px'
                }}>
                  {colItems.length}
                </div>
              </div>

              {/* Droppable */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      padding: 14, flexGrow: 1, minHeight: 200,
                      transition: 'background-color 0.2s ease',
                      backgroundColor: snapshot.isDraggingOver ? `${col.accent}08` : 'transparent',
                      borderRadius: '0 0 20px 20px'
                    }}
                  >
                    {colItems.length === 0 ? (
                      <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: 8, padding: '32px 16px', opacity: 0.45,
                        borderRadius: 14, border: `1.5px dashed ${col.accent}44`, marginTop: 4
                      }}>
                        <span style={{ fontSize: 28 }}>{col.emptyIcon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: col.color, textAlign: 'center' }}>
                          {col.emptyText}
                        </span>
                        <span style={{ fontSize: 11, color: colors.textDim, textAlign: 'center' }}>
                          Glissez un prospect ici
                        </span>
                      </div>
                    ) : (
                      colItems.map((item, index) => (
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
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
