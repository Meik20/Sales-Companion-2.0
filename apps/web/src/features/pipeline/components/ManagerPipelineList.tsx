'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { colors, shadows } from '@/styles/tokens'
import { useDeletePipelineItem } from '@/features/pipeline/hooks/useDeletePipelineItem'
import { useUpdatePipelineItem } from '@/features/pipeline/hooks/useUpdatePipelineItem'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'
import { getWhatsAppUrl } from '@/utils/whatsapp'
import { useExportTeamPerformance } from '@/features/pipeline/hooks/useExportTeamPerformance'
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
  MessageSquare,
  ChevronRight
} from 'lucide-react'

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
  memberName?: string | null // Nom du membre (stocké dans le doc pipeline)
  memberAccessId?: string | null // Access ID du membre (stocké dans le doc pipeline)
  nextFollowUp?: string | null
}

type Member = { uid: string; name?: string; email?: string; accessId?: string }

type Props = {
  items: PipelineItem[]
  members?: Member[]
  managerUid?: string
}

/** Résout le nom d'affichage d'un membre pour un item du pipeline */
function resolveMemberLabel(item: PipelineItem, members?: Member[]): string | null {
  if (!item.assignedTo) return null

  // 1. Priorité : champs stockés directement dans le doc pipeline
  if (item.memberName || item.memberAccessId) {
    const name = item.memberName || ''
    const id = (item.memberAccessId || '').toLowerCase()
    return name && id ? `${name} (${id})` : name || id
  }

  // 2. Fallback : chercher dans la liste des membres actifs
  const m = members?.find((m) => m.uid === item.assignedTo)
  if (!m) return item.assignedTo // fallback ultime : afficher l'UID
  const name = m.name || ''
  const id = (m.accessId || m.email || '').toLowerCase()
  return name && id ? `${name} (${id})` : name || id
}

const statusVariant: Record<string, 'info' | 'warning' | 'success'> = {
  prospection: 'info',
  prospect: 'info',
  negociation: 'warning',
  negotiation: 'warning',
  conclue: 'success',
  conclusion: 'success'
}

// ── Prospect detail modal ───────────────────────────────────────────────
// ── Prospect detail modal ───────────────────────────────────────────────
function ProspectModal({
  item,
  onClose,
  statusLabel,
  members,
  managerUid
}: {
  item: PipelineItem
  onClose: () => void
  statusLabel: Record<string, string>
  members?: Member[]
  managerUid?: string
}) {
  const { t } = useTranslation()
  const updateMutation = useUpdatePipelineItem()
  const { pushToast } = useToast()

  const [noteText, setNoteText] = useState(item.notes ?? item.note ?? '')

  return (
    <>
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
              background: colors.bg3,
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
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

              {item.assignedTo &&
                item.assignedTo !== managerUid &&
                (() => {
                  const label = resolveMemberLabel(item, members)
                  return label ? (
                    <InfoRow
                      icon={<User size={15} />}
                      label={t('pipeline.assignedTo')}
                      value={<strong>{label}</strong>}
                    />
                  ) : null
                })()}
            </div>
          </div>

          {/* ── NOTES — vue manager (seulement si renseignée) ── */}
          {noteText && (
            <div
              style={{
                background: 'rgba(34,197,94,0.03)',
                border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 12,
                padding: 18,
                marginBottom: 20
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <MessageSquare size={12} strokeWidth={3} style={{ color: '#22c55e' }} />
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#22c55e',
                    textTransform: 'uppercase',
                    letterSpacing: '.1em'
                  }}
                >
                  {t('pipeline.notesLabel')}
                </div>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: colors.text,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  opacity: 1
                }}
              >
                {noteText}
              </div>
            </div>
          )}

          {item.nextFollowUp && (
            <div
              style={{
                background: 'rgba(96,165,250,0.05)',
                border: '1px solid rgba(96,165,250,0.15)',
                borderRadius: 12,
                padding: '14px 16px',
                fontSize: 13,
                color: '#93c5fd',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <Calendar size={16} strokeWidth={2.5} />
              <span>
                <strong>{t('pipeline.nextFollowUpLabel')}</strong> : {item.nextFollowUp}
              </span>
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

// ── Export Panel ────────────────────────────────────────────────────────
function ExportPanel({ members }: { members?: Member[] }) {
  const { t } = useTranslation()
  const { exportPerformance, loading } = useExportTeamPerformance()
  const [open, setOpen] = useState(false)
  const [memberId, setMemberId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const inputStyle: React.CSSProperties = {
    background: colors.bg3,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 13,
    color: colors.text,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    color: colors.textMid,
    marginBottom: 4,
    display: 'block'
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
          background:
            'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)',
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
          justifyContent: 'space-between'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'
          e.currentTarget.style.background =
            'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.25) 100%)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'
          e.currentTarget.style.background =
            'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)'
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
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
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
                  {m.accessId ? ` (${m.accessId.toLowerCase()})` : ''}
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
                  to: to || undefined
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

export function ManagerPipelineList({ items, members, managerUid }: Props) {
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
        description: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setDeletingId(null)
    }
  }

  // Group by normalized status
  const normalize = (s: string) => {
    if (['prospection', 'prospect'].includes(s)) return 'prospection'
    if (['negociation', 'negotiation'].includes(s)) return 'negociation'
    if (['conclue', 'conclusion'].includes(s)) return 'conclue'
    return s
  }

  const grouped: Record<string, PipelineItem[]> = {
    prospection: items.filter((i) => normalize(i.status) === 'prospection'),
    negociation: items.filter((i) => normalize(i.status) === 'negociation'),
    conclue: items.filter((i) => normalize(i.status) === 'conclue')
  }

  return (
    <>
      {selectedItem && (
        <ProspectModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          statusLabel={statusLabel}
          members={members}
          managerUid={managerUid}
        />
      )}

      {/* Export panel — always shown for managers */}
      <ExportPanel members={members} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16
        }}
      >
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: colors.text,
                          marginBottom: 4
                        }}
                      >
                        {item.companyName}
                      </div>
                      <div
                        style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: colors.textMid,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px 10px'
                          }}
                        >
                          {item.companySector && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Building2 size={10} style={{ opacity: 0.7 }} />
                              {item.companySector}
                            </span>
                          )}
                          {item.companyCity && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={10} style={{ opacity: 0.7 }} />
                              {item.companyCity}
                            </span>
                          )}
                        </div>
                        {(item.notes ?? item.note) && (
                          <div
                            style={{
                              fontSize: 11,
                              color: '#fbbf24',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <MessageSquare size={10} />
                            {t('pipeline.hasNotes')}
                          </div>
                        )}
                      </div>
                      {item.assignedTo && item.assignedTo !== managerUid && (
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
                    color: colors.textMid
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
