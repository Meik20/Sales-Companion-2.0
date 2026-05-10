'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { colors } from '@/styles/tokens'
import { useDeletePipelineItem } from '@/features/pipeline/hooks/useDeletePipelineItem'
import { useUpdatePipelineItem } from '@/features/pipeline/hooks/useUpdatePipelineItem'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'
import { useExportTeamPerformance } from '@/features/pipeline/hooks/useExportTeamPerformance'

type PipelineItem = {
  id: string
  companyName: string
  status: string
  userId: string
  companyCity?: string | null
  companySector?: string | null
  companyPhone?: string | null
  companyEmail?: string | null
  note?: string | null
  notes?: string | null
  assignedTo?: string | null
  assignedByName?: string | null
  memberName?: string | null      // Nom du membre (stocké dans le doc pipeline)
  memberAccessId?: string | null  // Access ID du membre (stocké dans le doc pipeline)
  nextFollowUp?: string | null
}

type Member = { uid: string; name?: string; email?: string; accessId?: string }

type Props = { 
  items: PipelineItem[]
  members?: Member[]
}

/** Résout le nom d'affichage d'un membre pour un item du pipeline */
function resolveMemberLabel(
  item: PipelineItem,
  members?: Member[]
): string | null {
  if (!item.assignedTo) return null

  // 1. Priorité : champs stockés directement dans le doc pipeline
  if (item.memberName || item.memberAccessId) {
    const name = item.memberName || ''
    const id   = item.memberAccessId || ''
    return name && id ? `${name} (${id})` : name || id
  }

  // 2. Fallback : chercher dans la liste des membres actifs
  const m = members?.find(m => m.uid === item.assignedTo)
  if (!m) return item.assignedTo   // fallback ultime : afficher l'UID
  const name = m.name || ''
  const id   = m.accessId || m.email || ''
  return name && id ? `${name} (${id})` : name || id
}

const statusVariant: Record<string, 'info' | 'warning' | 'success'> = {
  prospection: 'info',
  prospect:    'info',
  negociation: 'warning',
  negotiation: 'warning',
  conclue:     'success',
  conclusion:  'success',
}

// ── Prospect detail modal ───────────────────────────────────────────────
// ── Prospect detail modal ───────────────────────────────────────────────
function ProspectModal({ 
  item, 
  onClose,
  statusLabel,
  members,
}: { 
  item: PipelineItem; 
  onClose: () => void;
  statusLabel: Record<string, string>;
  members?: Member[];
}) {
  const { t } = useTranslation()
  const updateMutation = useUpdatePipelineItem()
  const { pushToast } = useToast()

  const [noteText, setNoteText] = useState(item.notes ?? item.note ?? '')
  const [noteSaving, setNoteSaving] = useState(false)

  async function handleSaveNote() {
    setNoteSaving(true)
    try {
      await updateMutation.mutateAsync({ id: item.id, data: { notes: noteText } })
      pushToast({ type: 'success', title: t('pipeline.notesSaved') })
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
            borderRadius: 16, width: '100%', maxWidth: 520,
            padding: 28, pointerEvents: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            maxHeight: '90vh', overflowY: 'auto',
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
              {t('pipeline.contactInfo')}
            </div>
            {item.companySector && <InfoRow icon="🏭" label={t('pipeline.sector')} value={item.companySector} />}
            {item.companyCity   && <InfoRow icon="📍" label={t('pipeline.city')}   value={item.companyCity} />}
            <InfoRow
              icon="📞" label={t('pipeline.phone')}
              value={
                item.companyPhone
                  ? <a href={`tel:${item.companyPhone}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>{item.companyPhone}</a>
                  : <span style={{ color: colors.textMid, fontStyle: 'italic' }}>{t('pipeline.notSpecified')}</span>
              }
            />
            <InfoRow
              icon="✉️" label={t('pipeline.email')}
              value={
                item.companyEmail
                  ? <a href={`mailto:${item.companyEmail}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>{item.companyEmail}</a>
                  : <span style={{ color: colors.textMid, fontStyle: 'italic' }}>{t('pipeline.notSpecified')}</span>
              }
            />
            {item.assignedTo && (() => {
              const label = resolveMemberLabel(item, members)
              return label ? (
                <InfoRow 
                  icon="👤" 
                  label={t('pipeline.assignedTo')} 
                  value={label} 
                />
              ) : null
            })()}
          </div>

          {/* ── NOTES — section éditable ── */}
          <div style={{
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                📝 {t('pipeline.notesLabel')}
              </div>
              {noteChanged && (
                <Button
                  size="sm"
                  variant="primary"
                  loading={noteSaving}
                  onClick={() => void handleSaveNote()}
                  style={{ fontSize: 11, padding: '4px 10px', minHeight: 26 }}
                >
                  {t('pipeline.notesSaveBtn')}
                </Button>
              )}
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t('pipeline.placeholderNotes')}
              rows={4}
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
          </div>

          {item.nextFollowUp && (
            <div style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#93c5fd' }}>
              📅 {t('pipeline.nextFollowUpLabel')} : {item.nextFollowUp}
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

// ── Export Panel ────────────────────────────────────────────────────────
function ExportPanel({ members }: { members?: Member[] }) {
  const { t } = useTranslation()
  const { exportPerformance, loading } = useExportTeamPerformance()
  const [open, setOpen]         = useState(false)
  const [memberId, setMemberId] = useState('')
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')

  const inputStyle: React.CSSProperties = {
    background: colors.bg3,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 13,
    color: colors.text,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    color: colors.textMid,
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: 10,
          padding: '9px 16px',
          cursor: 'pointer',
          color: '#a5b4fc',
          fontWeight: 600,
          fontSize: 13,
          fontFamily: "'Syne',sans-serif",
          transition: 'all 200ms ease',
          width: '100%',
          justifyContent: 'space-between',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'
          e.currentTarget.style.background  = 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.25) 100%)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'
          e.currentTarget.style.background  = 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)'
        }}
      >
        <span>📊 {t('pipeline.exportPerformances')}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Collapsible form */}
      {open && (
        <div
          style={{
            marginTop: 10,
            background: colors.bg2,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          {/* Header */}
          <div style={{ fontSize: 13, color: colors.textMid, lineHeight: 1.5 }}>
            {t('pipeline.exportDesc')}
          </div>

          {/* Member filter */}
          <div>
            <label style={labelStyle}>{t('pipeline.filterMember')}</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              style={inputStyle}
            >
              <option value="">{t('pipeline.allMembers')}</option>
              {members?.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {m.name ?? m.email ?? m.uid}
                  {m.accessId ? ` (${m.accessId})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('pipeline.exportFrom')}</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('pipeline.exportTo')}</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setMemberId('')
                setFrom('')
                setTo('')
              }}
            >
              {t('pipeline.exportReset')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              loading={loading}
              onClick={() =>
                void exportPerformance({
                  memberId: memberId || undefined,
                  from: from || undefined,
                  to:   to   || undefined,
                })
              }
            >
              ⬇ {t('pipeline.exportDownload')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ManagerPipelineList({ items, members }: Props) {
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

  if (!items.length) return null

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
        <ProspectModal item={selectedItem} onClose={() => setSelectedItem(null)} statusLabel={statusLabel} members={members} />
      )}

      {/* Export panel — always shown for managers */}
      <ExportPanel members={members} />

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
                      {(item.notes ?? item.note) && (
                        <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 2 }}>
                          📝 {t('pipeline.hasNotes')}
                        </div>
                      )}
                      {item.assignedTo && (
                        <div style={{ fontSize: 11, color: 'rgba(99,102,241,0.7)', marginTop: 3 }}>
                          👤 {resolveMemberLabel(item, members) ?? item.assignedTo}
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
                  {t('pipeline.noProspect')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
