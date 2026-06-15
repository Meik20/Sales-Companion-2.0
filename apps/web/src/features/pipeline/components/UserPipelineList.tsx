'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { colors, shadows } from '@/styles/tokens'
import { useDeletePipelineItem } from '@/features/pipeline/hooks/useDeletePipelineItem'
import { useUpdatePipelineItem } from '@/features/pipeline/hooks/useUpdatePipelineItem'
import { getWhatsAppUrl } from '@/utils/whatsapp'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  AlertTriangle,
  X,
  Edit3,
  Save,
  RotateCcw,
  CheckCircle,
  ChevronRight,
  MessageSquare,
  LayoutGrid,
  List
} from 'lucide-react'

import { UserPipelineKanban } from './UserPipelineKanban'

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
  nextAction?: string | null
  nextDate?: string | null
  nextFollowUp?: string | null
  assignedByName?: string | null
  managerUid?: string | null
  sourceId?: string | null
  previousAssignees?: {
    userId: string
    memberName: string
    assignedAt: string
  }[]
}

type Props = {
  items: PipelineItem[]
  onStatusChange?: (id: string, status: 'prospection' | 'negociation' | 'conclue') => void
}

const statusVariant: Record<string, 'info' | 'warning' | 'success'> = {
  prospection: 'info',
  prospect: 'info',
  negociation: 'warning',
  negotiation: 'warning',
  conclue: 'success',
  conclusion: 'success'
}

// ── Contact Detail Modal ────────────────────────────────────────────────
// ── Contact Detail Modal ────────────────────────────────────────────────
function ProspectModal({
  item,
  onClose,
  onStatusChange,
  statusLabel
}: {
  item: PipelineItem
  onClose: () => void
  onStatusChange?: (id: string, status: 'prospection' | 'negociation' | 'conclue') => void
  statusLabel: Record<string, string>
}) {
  const { t } = useTranslation()
  const updateMutation = useUpdatePipelineItem()
  const { pushToast } = useToast()

  const [noteText, setNoteText] = useState(item.notes ?? item.note ?? '')
  const [noteSaving, setNoteSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  async function handleSaveNote() {
    setNoteSaving(true)
    try {
      await updateMutation.mutateAsync({ id: item.id, data: { notes: noteText } })
      pushToast({ type: 'success', title: t('pipeline.notesSaved') })
      setIsEditing(false)
    } catch {
      pushToast({ type: 'error', title: t('pipeline.notesSaveError') })
    } finally {
      setNoteSaving(false)
    }
  }

  const originalNote = item.notes ?? item.note ?? ''
  const noteChanged = noteText !== originalNote

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            background: colors.bg2,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            width: '100%',
            maxWidth: 520,
            padding: 28,
            pointerEvents: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 24
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: colors.text,
                  fontFamily: "'Syne', sans-serif",
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em'
                }}
              >
                {item.companyName}
              </h2>
              <div style={{ marginTop: 8 }}>
                <Badge variant={statusVariant[item.status] ?? 'default'}>
                  {statusLabel[item.status] ?? item.status}
                </Badge>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: colors.bg3,
                border: `1px solid ${colors.border}`,
                cursor: 'pointer',
                color: colors.textMid,
                padding: 8,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                marginLeft: 16
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.bg4
                e.currentTarget.style.color = colors.text
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.bg3
                e.currentTarget.style.color = colors.textMid
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Contact Info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: colors.bg3,
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              border: `1px solid ${colors.border}`,
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: colors.textMid,
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <User size={12} strokeWidth={3} />
              {t('pipeline.contactInfo')}
            </div>

            {item.companySector && (
              <div
                style={{
                  fontSize: 13,
                  color: colors.text,
                  fontWeight: 500,
                  background: 'rgba(96, 165, 250, 0.08)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(96, 165, 250, 0.15)',
                  lineHeight: 1.5,
                  marginTop: 4,
                  marginBottom: 4,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}
              >
                <Building2 size={16} style={{ color: '#60a5fa', flexShrink: 0, marginTop: 2 }} />
                <span>{item.companySector}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {item.companyCity && (
                <InfoRow
                  icon={<MapPin size={15} />}
                  label={t('pipeline.city')}
                  value={item.companyCity}
                />
              )}

              <InfoRow
                icon={<Phone size={15} />}
                label={t('pipeline.phone')}
                value={
                  item.companyPhone ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <a
                        href={`tel:${item.companyPhone}`}
                        style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {item.companyPhone}
                      </a>
                      <a
                        href={getWhatsAppUrl(item.companyPhone, `Bonjour, je vous contacte suite à...`)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#25D366',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textDecoration: 'none',
                          transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                        </svg>
                        WhatsApp
                      </a>
                    </div>
                  ) : (
                    <span style={{ color: colors.textDim, fontStyle: 'italic' }}>
                      {t('pipeline.notSpecified')}
                    </span>
                  )
                }
              />

              <InfoRow
                icon={<Mail size={15} />}
                label={t('pipeline.email')}
                value={
                  item.companyEmail ? (
                    <a
                      href={`mailto:${item.companyEmail}`}
                      style={{
                        color: '#60a5fa',
                        textDecoration: 'none',
                        fontWeight: 600,
                        wordBreak: 'break-all',
                        lineHeight: 1.4
                      }}
                    >
                      {item.companyEmail}
                    </a>
                  ) : (
                    <span style={{ color: colors.textDim, fontStyle: 'italic' }}>
                      {t('pipeline.notSpecified')}
                    </span>
                  )
                }
              />
            </div>
          </div>

          {/* ── NOTES — section éditable ── */}
          <div
            style={{
              background: isEditing ? 'rgba(251,191,36,0.03)' : 'rgba(34,197,94,0.03)',
              border: isEditing
                ? '1px solid rgba(251,191,36,0.2)'
                : '1px solid rgba(34,197,94,0.2)',
              borderRadius: 12,
              padding: 18,
              marginBottom: 20,
              transition: 'all 300ms ease'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: isEditing ? '#fbbf24' : '#22c55e',
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <MessageSquare size={12} strokeWidth={3} />
                {t('pipeline.notesLabel')}
              </div>

              {!isEditing ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    minHeight: 26,
                    color: '#22c55e',
                    borderColor: 'rgba(34,197,94,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Edit3 size={11} />
                  {t('common.edit') || 'Modifier'}
                </Button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setNoteText(originalNote)
                      setIsEditing(false)
                    }}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      minHeight: 26,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <RotateCcw size={11} />
                    {t('common.cancel') || 'Annuler'}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={noteSaving}
                    disabled={!noteChanged}
                    onClick={() => void handleSaveNote()}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      minHeight: 26,
                      background: '#22c55e',
                      borderColor: '#22c55e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Save size={11} />
                    {t('pipeline.notesSaveBtn')}
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              <>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={t('pipeline.placeholderNotes')}
                  rows={4}
                  autoFocus
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: colors.bg2,
                    border: '1px solid rgba(251,191,36,0.3)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 14,
                    color: colors.text,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    minHeight: 100,
                    transition: 'border-color 200ms ease'
                  }}
                />
                {noteChanged && (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#fbbf24',
                      marginTop: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <AlertTriangle size={10} />
                    {t('pipeline.notesUnsaved')}
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  fontSize: 14,
                  color: colors.text,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  minHeight: noteText ? 'auto' : 40,
                  fontStyle: noteText ? 'normal' : 'italic',
                  opacity: noteText ? 1 : 0.5
                }}
              >
                {noteText || t('pipeline.placeholderNotes')}
              </div>
            )}
          </div>

          {/* Next follow-up */}
          {(item.nextFollowUp ?? item.nextDate) && (
            <div
              style={{
                background: 'rgba(96,165,250,0.05)',
                border: '1px solid rgba(96,165,250,0.15)',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 20,
                fontSize: 13,
                color: '#93c5fd',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <Calendar size={16} strokeWidth={2.5} />
              <span>
                <strong>{t('pipeline.nextFollowUpLabel')}</strong> :{' '}
                {item.nextFollowUp ?? item.nextDate}
              </span>
            </div>
          )}

          {/* Assigné par */}
          {item.assignedByName && (
            <div
              style={{
                fontSize: 12,
                color: colors.textMid,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 4px'
              }}
            >
              <User size={14} style={{ opacity: 0.6 }} />
              <span>
                {t('pipeline.assignedBy')} :{' '}
                <strong style={{ color: colors.text }}>{item.assignedByName}</strong>
              </span>
            </div>
          )}

          {/* Déjà visité / assigné */}
          {item.previousAssignees && item.previousAssignees.length > 0 && (
            <div
              style={{
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 20,
                fontSize: 13,
                color: '#f87171',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>Attention :</strong>
                Ce prospect a déjà été visité/assigné précédemment à :
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 16, fontSize: 12, opacity: 0.9 }}>
                  {item.previousAssignees.map((pa, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      <strong>{pa.memberName}</strong> (le{' '}
                      {new Date(pa.assignedAt).toLocaleDateString()})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Status Actions */}
          {onStatusChange && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {item.status !== 'prospection' && item.status !== 'prospect' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onStatusChange(item.id, 'prospection')
                    onClose()
                  }}
                >
                  {t('pipeline.prospection')}
                </Button>
              )}
              {item.status !== 'negociation' && item.status !== 'negotiation' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onStatusChange(item.id, 'negociation')
                    onClose()
                  }}
                >
                  {t('pipeline.negotiation')}
                </Button>
              )}
              {item.status !== 'conclue' && item.status !== 'conclusion' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onStatusChange(item.id, 'conclue')
                    onClose()
                  }}
                >
                  ✓ {t('pipeline.closed')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function InfoRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14 }}>
      <span
        style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bg2,
          borderRadius: 8,
          color: colors.textMid,
          flexShrink: 0,
          border: `1px solid ${colors.border}`
        }}
      >
        {icon}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            color: colors.textDim,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {label}
        </span>
        <span style={{ color: colors.text, fontWeight: 500, lineHeight: 1.4 }}>{value}</span>
      </div>
    </div>
  )
}

// ── Main List Component ────────────────────────────────────────────────
export function UserPipelineList({ items, onStatusChange }: Props) {
  const { t } = useTranslation()
  const deleteMutation = useDeletePipelineItem()

  const statusLabel: Record<string, string> = {
    prospection: t('pipeline.prospection'),
    prospect: t('pipeline.prospection'),
    negociation: t('pipeline.negotiation'),
    negotiation: t('pipeline.negotiation'),
    conclue: t('pipeline.closed'),
    conclusion: t('pipeline.closed')
  }
  const { pushToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
      pushToast({ type: 'success', title: t('pipeline.deleteSuccess') })
    } catch (err) {
      pushToast({
        type: 'error',
        title: t('pipeline.deleteError'),
        description: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setDeletingId(null)
    }
  }

  if (!items.length) return null

  return (
    <>
      {/* Prospect Detail Modal */}
      {selectedItem && (
        <ProspectModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onStatusChange={onStatusChange}
          statusLabel={statusLabel}
        />
      )}

      {/* View Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
         <div style={{ display: 'flex', background: colors.bg3, padding: 4, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <button
               onClick={() => setViewMode('kanban')}
               style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === 'kanban' ? colors.bg : 'transparent',
                  color: viewMode === 'kanban' ? colors.text : colors.textMid,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: viewMode === 'kanban' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s ease'
               }}
            >
               <LayoutGrid size={14} /> Kanban
            </button>
            <button
               onClick={() => setViewMode('list')}
               style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === 'list' ? colors.bg : 'transparent',
                  color: viewMode === 'list' ? colors.text : colors.textMid,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s ease'
               }}
            >
               <List size={14} /> Liste
            </button>
         </div>
      </div>

      {viewMode === 'kanban' ? (
         <UserPipelineKanban 
            items={items} 
            onStatusChange={onStatusChange!} 
            onItemClick={setSelectedItem} 
         />
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            style={{
              padding: '14px 18px',
              background: colors.bg3,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              cursor: 'pointer',
              transition: 'all 200ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
              e.currentTarget.style.background = colors.bg2
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.background = colors.bg3
            }}
          >
            {/* Content */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 6,
                  flexWrap: 'wrap'
                }}
              >
                <strong style={{ fontSize: 14, color: colors.text }}>{item.companyName}</strong>
                <Badge variant={statusVariant[item.status] ?? 'default'}>
                  {statusLabel[item.status] ?? item.status}
                </Badge>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px 16px',
                  fontSize: 12,
                  color: colors.textMid,
                  marginTop: 4
                }}
              >
                {item.companySector && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={12} style={{ opacity: 0.7 }} />
                    {item.companySector}
                  </span>
                )}
                {item.companyCity && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={12} style={{ opacity: 0.7 }} />
                    {item.companyCity}
                  </span>
                )}
                {item.companyPhone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={12} style={{ opacity: 0.7 }} />
                    {item.companyPhone}
                  </span>
                )}
                {item.companyEmail && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={12} style={{ opacity: 0.7 }} />
                    {item.companyEmail}
                  </span>
                )}
                {(item.notes ?? item.note) && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24' }}>
                    <MessageSquare size={12} />
                    {t('pipeline.hasNotes')}
                  </span>
                )}
              </div>

              {item.assignedByName && (
                <div style={{ fontSize: 11, color: 'rgba(99,102,241,0.7)', marginTop: 5 }}>
                  👤 {t('pipeline.assignedBy')} : {item.assignedByName}
                </div>
              )}

              {item.previousAssignees && item.previousAssignees.length > 0 && (
                <div style={{ fontSize: 11, color: '#f87171', marginTop: 5, fontWeight: 500 }}>
                  ⚠️ Déjà visité par d'autres membres
                </div>
              )}

              <div style={{ fontSize: 11, color: 'rgba(99,102,241,0.7)', marginTop: 5 }}>
                {t('pipeline.clickForDetails')} →
              </div>
            </div>

            {/* Delete button — stop propagation */}
            <Button
              size="sm"
              variant="danger"
              loading={deletingId === item.id}
              onClick={(e) => void handleDelete(e as React.MouseEvent, item.id)}
              style={{ flexShrink: 0 }}
            >
              🗑️
            </Button>
          </div>
        ))}
      </div>
      )}
    </>
  )
}
