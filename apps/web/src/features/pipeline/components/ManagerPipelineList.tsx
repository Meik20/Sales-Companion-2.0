'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { colors } from '@/styles/tokens'
import { useDeletePipelineItem } from '@/features/pipeline/hooks/useDeletePipelineItem'
import { useToast } from '@/hooks/useToast'

type PipelineItem = {
  id: string
  companyName: string
  status: string
  userId: string
  companyCity?: string
  companySector?: string
  companyPhone?: string
  companyEmail?: string
  note?: string
  notes?: string
  assignedTo?: string | null
  assignedByName?: string
  nextFollowUp?: string | null
}

type Props = { items: PipelineItem[] }

const statusVariant: Record<string, 'info' | 'warning' | 'success'> = {
  prospection: 'info',
  prospect:    'info',
  negociation: 'warning',
  negotiation: 'warning',
  conclue:     'success',
  conclusion:  'success',
}

const statusLabel: Record<string, string> = {
  prospection: 'Prospection',
  prospect:    'Prospection',
  negociation: 'Négociation',
  negotiation: 'Négociation',
  conclue:     'Conclue',
  conclusion:  'Conclue',
}

// ── Prospect detail modal ───────────────────────────────────────────────
function ProspectModal({ item, onClose }: { item: PipelineItem; onClose: () => void }) {
  const noteText = item.notes ?? item.note ?? ''
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        }}
      />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px 16px', pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: colors.bg2, border: `1px solid ${colors.border}`,
            borderRadius: 16, width: '100%', maxWidth: 480,
            padding: 28, pointerEvents: 'auto',
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
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: colors.textMid, padding: '2px 6px', borderRadius: 6 }}
            >
              ✕
            </button>
          </div>

          {/* Contact Info */}
          <div style={{ background: colors.bg3, borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: colors.textMid, marginBottom: 2 }}>
              Informations de contact
            </div>
            {item.companySector && <InfoRow icon="🏭" label="Secteur" value={item.companySector} />}
            {item.companyCity   && <InfoRow icon="📍" label="Ville"   value={item.companyCity} />}
            <InfoRow
              icon="📞" label="Téléphone"
              value={
                item.companyPhone
                  ? <a href={`tel:${item.companyPhone}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>{item.companyPhone}</a>
                  : <span style={{ color: colors.textMid, fontStyle: 'italic' }}>Non renseigné</span>
              }
            />
            <InfoRow
              icon="✉️" label="Email"
              value={
                item.companyEmail
                  ? <a href={`mailto:${item.companyEmail}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>{item.companyEmail}</a>
                  : <span style={{ color: colors.textMid, fontStyle: 'italic' }}>Non renseigné</span>
              }
            />
            {item.assignedTo && <InfoRow icon="👤" label="Assigné à" value={item.assignedTo} />}
          </div>

          {noteText && (
            <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>📝 Notes</div>
              <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.5 }}>{noteText}</div>
            </div>
          )}

          {item.nextFollowUp && (
            <div style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#93c5fd' }}>
              📅 Prochain suivi : {item.nextFollowUp}
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

export function ManagerPipelineList({ items }: Props) {
  const deleteMutation = useDeletePipelineItem()
  const { pushToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null)

  if (!items.length) return null

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
      pushToast({ type: 'success', title: 'Prospect supprimé du pipeline' })
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Suppression impossible',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setDeletingId(null)
    }
  }

  // Group by normalized status
  const normalize = (s: string) => {
    if (['prospection','prospect'].includes(s)) return 'prospection'
    if (['negociation','negotiation'].includes(s)) return 'negociation'
    if (['conclue','conclusion'].includes(s)) return 'conclue'
    return s
  }

  const grouped: Record<string, PipelineItem[]> = {
    prospection: items.filter((i) => normalize(i.status) === 'prospection'),
    negociation: items.filter((i) => normalize(i.status) === 'negociation'),
    conclue:     items.filter((i) => normalize(i.status) === 'conclue'),
  }

  return (
    <>
      {selectedItem && (
        <ProspectModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {Object.entries(grouped).map(([status, groupItems]) => (
          <div key={status}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Badge variant={statusVariant[status] ?? 'default'}>
                {statusLabel[status]} ({groupItems.length})
              </Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    padding: '12px 14px',
                    background: colors.bg3,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: colors.text, marginBottom: 4 }}>
                        {item.companyName}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textMid }}>
                        {item.companySector ? `🏭 ${item.companySector}` : ''}
                        {item.companyCity   ? ` · 📍 ${item.companyCity}` : ''}
                      </div>
                      {item.assignedTo && (
                        <div style={{ fontSize: 11, color: 'rgba(99,102,241,0.7)', marginTop: 3 }}>
                          👤 {item.assignedTo}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={deletingId === item.id}
                      onClick={(e) => void handleDelete(e as React.MouseEvent, item.id)}
                      style={{ flexShrink: 0, padding: '0 8px', minHeight: 28 }}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              ))}

              {groupItems.length === 0 && (
                <div
                  style={{
                    padding: '20px 14px',
                    background: colors.bg3,
                    border: `1px dashed ${colors.border}`,
                    borderRadius: 10,
                    textAlign: 'center',
                    fontSize: 12,
                    color: colors.textMid,
                  }}
                >
                  Aucun prospect
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
