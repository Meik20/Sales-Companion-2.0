'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { colors } from '@/styles/tokens'
import { useDeletePipelineItem } from '@/features/pipeline/hooks/useDeletePipelineItem'
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
  const noteText = item.notes ?? item.note ?? ''

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
            width: '100%', maxWidth: 480,
            padding: 28,
            pointerEvents: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: "'Syne',sans-serif" }}>
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
              <InfoRow icon="🏭" label={t('pipeline.sector')} value={item.companySector} />
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

          {/* Notes */}
          {noteText && (
            <div style={{
              background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                📝 {t('pipeline.notesLabel')}
              </div>
              <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.5 }}>{noteText}</div>
            </div>
          )}

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
