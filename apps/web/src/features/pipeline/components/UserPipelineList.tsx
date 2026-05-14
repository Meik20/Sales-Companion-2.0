'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { colors } from '@/styles/tokens'
import { useDeletePipelineItem } from '@/features/pipeline/hooks/useDeletePipelineItem'
import { useUpdatePipelineItem } from '@/features/pipeline/hooks/useUpdatePipelineItem'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'

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
}

type Props = {
  items: PipelineItem[]
  onStatusChange?: (id: string, status: 'prospection' | 'negociation' | 'conclue') => void
}

const statusVariant: Record<string, 'info' | 'warning' | 'success'> = {
  prospection: 'info',
  prospect:    'info',
  negociation: 'warning',
  negotiation: 'warning',
  conclue:     'success',
  conclusion:  'success',
}

// ── Contact Detail Modal ────────────────────────────────────────────────
// ── Contact Detail Modal ────────────────────────────────────────────────
function ProspectModal({
  item,
  onClose,
  onStatusChange,
  statusLabel,
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
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px 16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: colors.bg2,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            width: '100%', maxWidth: 520,
            padding: 28,
            pointerEvents: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: 'inherit' }}>
                {item.companyName}
              </h2>
              <div style={{ marginTop: 6 }}>
                <Badge variant={statusVariant[item.status] ?? 'default'}>
                  {statusLabel[item.status] ?? item.status}
                </Badge>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 20, color: colors.textMid, lineHeight: 1,
                padding: '2px 6px', borderRadius: 6,
              }}
            >
              ✕
            </button>
          </div>

          {/* Contact Info */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            background: colors.bg3, borderRadius: 10, padding: '14px 16px',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: colors.textMid, marginBottom: 2 }}>
              {t('pipeline.contactInfo')}
            </div>

            {item.companySector && (
              <div style={{ 
                fontSize: 12, 
                color: 'var(--color-primary)', 
                fontWeight: 600, 
                background: 'var(--color-blue-50)', 
                padding: '8px 12px', 
                borderRadius: '8px',
                borderLeft: '4px solid var(--color-primary)',
                lineHeight: 1.4,
                marginTop: '6px',
                marginBottom: '8px'
              }}>
                {item.companySector}
              </div>
            )}
            {item.companyCity && (
              <InfoRow icon="📍" label={t('pipeline.city')} value={item.companyCity} />
            )}
            {item.companyPhone ? (
              <InfoRow
                icon="📞" label={t('pipeline.phone')}
                value={
                  <a href={`tel:${item.companyPhone}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>
                    {item.companyPhone}
                  </a>
                }
              />
            ) : (
              <InfoRow icon="📞" label={t('pipeline.phone')} value={<span style={{ color: colors.textMid, fontStyle: 'italic' }}>{t('pipeline.notSpecified')}</span>} />
            )}
            {item.companyEmail ? (
              <InfoRow
                icon="✉️" label={t('pipeline.email')}
                value={
                  <a href={`mailto:${item.companyEmail}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>
                    {item.companyEmail}
                  </a>
                }
              />
            ) : (
              <InfoRow icon="✉️" label={t('pipeline.email')} value={<span style={{ color: colors.textMid, fontStyle: 'italic' }}>{t('pipeline.notSpecified')}</span>} />
            )}
          </div>

          {/* ── NOTES — section éditable ── */}
          <div style={{
            background: isEditing ? 'rgba(251,191,36,0.06)' : 'rgba(34,197,94,0.06)',
            border: isEditing ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(34,197,94,0.25)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 16,
            transition: 'all 300ms ease',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <div style={{ 
                fontSize: 11, fontWeight: 700, 
                color: isEditing ? '#fbbf24' : '#22c55e', 
                textTransform: 'uppercase', letterSpacing: '.06em',
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                📝 {t('pipeline.notesLabel')}
              </div>
              
              {!isEditing ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  style={{ fontSize: 11, padding: '4px 10px', minHeight: 26, color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}
                >
                  ✎ {t('common.edit') || 'Modifier'}
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
                    style={{ fontSize: 11, padding: '4px 10px', minHeight: 26 }}
                  >
                    {t('common.cancel') || 'Annuler'}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={noteSaving}
                    disabled={!noteChanged}
                    onClick={() => void handleSaveNote()}
                    style={{ fontSize: 11, padding: '4px 10px', minHeight: 26, background: '#22c55e', borderColor: '#22c55e' }}
                  >
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
                    background: 'transparent',
                    border: '1px solid rgba(251,191,36,0.2)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 13,
                    color: colors.text,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    minHeight: 90,
                    transition: 'border-color 200ms ease',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.5)' }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.2)' }}
                />
                {noteChanged && (
                  <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 6, opacity: 0.8 }}>
                    {t('pipeline.notesUnsaved')}
                  </div>
                )}
              </>
            ) : (
              <div style={{ 
                fontSize: 13, 
                color: colors.text, 
                lineHeight: 1.6, 
                whiteSpace: 'pre-wrap',
                minHeight: noteText ? 'auto' : 40,
                fontStyle: noteText ? 'normal' : 'italic',
                opacity: noteText ? 1 : 0.6
              }}>
                {noteText || t('pipeline.placeholderNotes')}
              </div>
            )}
          </div>

          {/* Next follow-up */}
          {(item.nextFollowUp ?? item.nextDate) && (
            <div style={{
              background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: '#93c5fd',
            }}>
              📅 {t('pipeline.nextFollowUpLabel')} : {item.nextFollowUp ?? item.nextDate}
            </div>
          )}

          {/* Assigné par */}
          {item.assignedByName && (
            <div style={{ fontSize: 12, color: colors.textMid, marginBottom: 16 }}>
              {t('pipeline.assignedBy')} : <span style={{ color: colors.text }}>{item.assignedByName}</span>
            </div>
          )}

          {/* Status Actions */}
          {onStatusChange && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {item.status !== 'prospection' && item.status !== 'prospect' && (
                <Button size="sm" variant="ghost" onClick={() => { onStatusChange(item.id, 'prospection'); onClose() }}>
                  {t('pipeline.prospection')}
                </Button>
              )}
              {item.status !== 'negociation' && item.status !== 'negotiation' && (
                <Button size="sm" variant="ghost" onClick={() => { onStatusChange(item.id, 'negociation'); onClose() }}>
                  {t('pipeline.negotiation')}
                </Button>
              )}
              {item.status !== 'conclue' && item.status !== 'conclusion' && (
                <Button size="sm" variant="primary" onClick={() => { onStatusChange(item.id, 'conclue'); onClose() }}>
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

function InfoRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
      <span style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ color: colors.textMid, minWidth: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ color: colors.text, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

// ── Main List Component ────────────────────────────────────────────────
export function UserPipelineList({ items, onStatusChange }: Props) {
  const { t } = useTranslation()
  const deleteMutation = useDeletePipelineItem()

  const statusLabel: Record<string, string> = {
    prospection: t('pipeline.prospection'),
    prospect:    t('pipeline.prospection'),
    negociation: t('pipeline.negotiation'),
    negotiation: t('pipeline.negotiation'),
    conclue:     t('pipeline.closed'),
    conclusion:  t('pipeline.closed'),
  }
  const { pushToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null)

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
        description: err instanceof Error ? err.message : 'Unknown error',
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
              transition: 'all 200ms ease',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14, color: colors.text }}>
                  {item.companyName}
                </strong>
                <Badge variant={statusVariant[item.status] ?? 'default'}>
                  {statusLabel[item.status] ?? item.status}
                </Badge>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px', fontSize: 12, color: colors.textMid }}>
                {item.companySector && <span>🏭 {item.companySector}</span>}
                {item.companyCity   && <span>📍 {item.companyCity}</span>}
                {item.companyPhone  && <span>📞 {item.companyPhone}</span>}
                {item.companyEmail  && <span>✉️ {item.companyEmail}</span>}
                {(item.notes ?? item.note) && (
                  <span style={{ color: '#fbbf24' }}>📝 {t('pipeline.hasNotes')}</span>
                )}
              </div>

              {item.assignedByName && (
                <div style={{ fontSize: 11, color: 'rgba(99,102,241,0.7)', marginTop: 5 }}>
                  👤 {t('pipeline.assignedBy')} : {item.assignedByName}
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
    </>
  )
}
