'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Badge } from '@/components/ui/index'
import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'
import { Building2, MapPin, Phone, MessageSquare } from 'lucide-react'

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
  { id: 'prospection', labelKey: 'pipeline.prospection', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.05)' },
  { id: 'negociation', labelKey: 'pipeline.negotiation', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.05)' },
  { id: 'conclue', labelKey: 'pipeline.closed', color: '#4ade80', bgColor: 'rgba(74,222,128,0.05)' }
]

const normalizeStatus = (status: string) => {
  if (['prospection', 'prospect'].includes(status)) return 'prospection'
  if (['negociation', 'negotiation'].includes(status)) return 'negociation'
  if (['conclue', 'conclusion'].includes(status)) return 'conclue'
  return 'prospection' // Fallback
}

export function UserPipelineKanban({ items, onStatusChange, onItemClick }: Props) {
  const { t } = useTranslation()
  const [columns, setColumns] = useState<Record<string, PipelineItem[]>>({
    prospection: [],
    negociation: [],
    conclue: []
  })
  
  // Hydration fix for Drag and Drop
  const [isMounted, setIsMounted] = useState(false)

  // Populate columns when items change
  useEffect(() => {
    setIsMounted(true)
    const newCols: Record<string, PipelineItem[]> = {
      prospection: [],
      negociation: [],
      conclue: []
    }
    items.forEach(item => {
      const status = normalizeStatus(item.status)
      if (newCols[status]) {
        newCols[status].push(item)
      }
    })
    setColumns(newCols)
  }, [items])

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result

    // Dropped outside a column
    if (!destination) return

    // Dropped in the same place
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const startColId = source.droppableId
    const finishColId = destination.droppableId

    // Move item in UI immediately (Optimistic update)
    const startItems = Array.from(columns[startColId] || [])
    const finishItems = startColId === finishColId ? startItems : Array.from(columns[finishColId] || [])
    
    const [movedItem] = startItems.splice(source.index, 1)
    if (!movedItem) return

    if (startColId === finishColId) {
      startItems.splice(destination.index, 0, movedItem)
      setColumns({ ...columns, [startColId]: startItems })
    } else {
      movedItem.status = finishColId // update local status for UI consistency
      finishItems.splice(destination.index, 0, movedItem)
      setColumns({ ...columns, [startColId]: startItems, [finishColId]: finishItems })
      
      // Call backend mutation
      onStatusChange(draggableId, finishColId as 'prospection' | 'negociation' | 'conclue')
    }
  }

  if (!isMounted) return <div style={{ minHeight: 400 }} />

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 16, minHeight: 600 }}>
        {COLUMNS.map(col => {
          const colItems = columns[col.id] || []
          
          return (
            <div key={col.id} style={{ 
              flex: '1 1 320px', 
              minWidth: 320,
              display: 'flex',
              flexDirection: 'column',
              background: colors.bg2,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              overflow: 'hidden'
            }}>
              {/* Column Header */}
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: `1px solid ${colors.border}`,
                background: col.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: col.color }}>
                  {t(col.labelKey)}
                </h3>
                <Badge variant="default" style={{ background: colors.bg3 }}>
                  {colItems.length}
                </Badge>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      padding: 16,
                      flexGrow: 1,
                      minHeight: 150,
                      transition: 'background-color 0.2s ease',
                      backgroundColor: snapshot.isDraggingOver ? 'rgba(255,255,255,0.02)' : 'transparent'
                    }}
                  >
                    {colItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onItemClick(item)}
                            style={{
                              padding: 16,
                              marginBottom: 12,
                              background: colors.bg3,
                              border: `1px solid ${snapshot.isDragging ? col.color : colors.border}`,
                              borderRadius: 12,
                              boxShadow: snapshot.isDragging ? '0 8px 24px rgba(0,0,0,0.2)' : 'none',
                              cursor: 'grab',
                              ...provided.draggableProps.style
                            }}
                          >
                            <h4 style={{ margin: '0 0 8px 0', fontSize: 15, color: colors.text }}>
                              {item.companyName}
                            </h4>
                            
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: colors.textMid }}>
                              {item.companySector && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Building2 size={12} /> {item.companySector}
                                </span>
                              )}
                              {item.companyCity && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <MapPin size={12} /> {item.companyCity}
                                </span>
                              )}
                              {item.companyPhone && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Phone size={12} />
                                </span>
                              )}
                              {(item.notes ?? item.note) && (
                                <span style={{ color: '#fbbf24' }}>
                                  <MessageSquare size={12} />
                                </span>
                              )}
                            </div>
                            
                            {item.previousAssignees && item.previousAssignees.length > 0 && (
                              <div style={{ fontSize: 11, color: '#f87171', marginTop: 8, fontWeight: 500 }}>
                                ⚠️ Déjà visité
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
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
