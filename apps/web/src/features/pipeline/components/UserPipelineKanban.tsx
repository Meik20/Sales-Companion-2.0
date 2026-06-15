'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'
import { Building2, MapPin, Phone, MessageSquare, GripVertical, TrendingUp, Handshake, CheckCircle2 } from 'lucide-react'

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

// Derive initials from a company name for the avatar
function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function UserPipelineKanban({ items, onStatusChange, onItemClick }: Props) {
  const { t } = useTranslation()
  const [columns, setColumns] = useState<Record<string, PipelineItem[]>>({
    prospection: [],
    negociation: [],
    conclue: []
  })

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

  if (!isMounted) return <div style={{ minHeight: 400 }} />

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
          const ColIcon = col.icon

          return (
            <div
              key={col.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: colors.bg2,
                border: `1px solid ${col.border}`,
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: `0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)`
              }}
            >
              {/* ── Column Header ── */}
              <div
                style={{
                  padding: '18px 20px 16px',
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
                      letterSpacing: '-0.01em',
                      fontFamily: "'Syne', sans-serif"
                    }}
                  >
                    {t(col.labelKey)}
                  </span>
                </div>

                {/* Count badge */}
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

              {/* ── Droppable Area ── */}
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
                      backgroundColor: snapshot.isDraggingOver
                        ? `${col.accent}08`
                        : 'transparent',
                      borderRadius: '0 0 20px 20px'
                    }}
                  >
                    {colItems.length === 0 ? (
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
                        <span style={{ fontSize: 28 }}>{col.emptyIcon}</span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: col.color,
                            textAlign: 'center'
                          }}
                        >
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
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              onClick={() => onItemClick(item)}
                              style={{
                                marginBottom: 10,
                                background: snapshot.isDragging ? colors.bg4 : colors.bg3,
                                border: `1px solid ${snapshot.isDragging ? col.accent : colors.border}`,
                                borderLeft: `3px solid ${col.accent}`,
                                borderRadius: 14,
                                boxShadow: snapshot.isDragging
                                  ? `0 12px 40px rgba(0,0,0,0.25), 0 0 0 1px ${col.accent}44`
                                  : '0 2px 8px rgba(0,0,0,0.06)',
                                cursor: 'pointer',
                                transition: 'box-shadow 200ms ease, border-color 200ms ease',
                                overflow: 'hidden',
                                ...provided.draggableProps.style
                              }}
                            >
                              {/* Drag handle + content */}
                              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                {/* Drag handle */}
                                <div
                                  {...provided.dragHandleProps}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 24,
                                    flexShrink: 0,
                                    cursor: 'grab',
                                    color: colors.textDim,
                                    opacity: 0.4,
                                    paddingLeft: 6
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVertical size={14} />
                                </div>

                                {/* Card body */}
                                <div style={{ flex: 1, padding: '14px 14px 14px 8px' }}>
                                  {/* Company name + initials avatar */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: 10,
                                      marginBottom: 10
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 36,
                                        height: 36,
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
                                        fontFamily: "'Syne', sans-serif",
                                        letterSpacing: '0.02em'
                                      }}
                                    >
                                      {getInitials(item.companyName)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 800,
                                          color: colors.text,
                                          lineHeight: 1.3,
                                          letterSpacing: '-0.01em',
                                          fontFamily: "'Syne', sans-serif",
                                          wordBreak: 'break-word'
                                        }}
                                      >
                                        {item.companyName}
                                      </div>
                                      {item.companySector && (
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color: colors.textMid,
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

                                  {/* Chips: city, phone, notes */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: 6,
                                      marginTop: 4
                                    }}
                                  >
                                    {item.companyCity && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: colors.textMid,
                                          background: colors.bg2,
                                          border: `1px solid ${colors.border}`,
                                          borderRadius: 6,
                                          padding: '2px 8px'
                                        }}
                                      >
                                        <MapPin size={10} style={{ opacity: 0.7 }} />
                                        {item.companyCity}
                                      </span>
                                    )}
                                    {item.companyPhone && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: '#22c55e',
                                          background: 'rgba(34,197,94,0.08)',
                                          border: '1px solid rgba(34,197,94,0.2)',
                                          borderRadius: 6,
                                          padding: '2px 8px'
                                        }}
                                      >
                                        <Phone size={10} />
                                        Tél
                                      </span>
                                    )}
                                    {(item.notes ?? item.note) && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: '#fbbf24',
                                          background: 'rgba(251,191,36,0.08)',
                                          border: '1px solid rgba(251,191,36,0.2)',
                                          borderRadius: 6,
                                          padding: '2px 8px'
                                        }}
                                      >
                                        <MessageSquare size={10} />
                                        Notes
                                      </span>
                                    )}
                                  </div>

                                  {/* Already visited warning */}
                                  {item.previousAssignees && item.previousAssignees.length > 0 && (
                                    <div
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: 11,
                                        color: '#f87171',
                                        fontWeight: 600,
                                        marginTop: 8,
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: 6,
                                        padding: '2px 8px'
                                      }}
                                    >
                                      ⚠️ Déjà visité
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
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
