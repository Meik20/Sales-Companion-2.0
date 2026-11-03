'use client'

import { useState } from 'react'
import { Badge, ConfirmDialog } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { useDeletePipelineItem } from '@/features/pipeline/hooks/useDeletePipelineItem'
import { useUpdatePipelineItem } from '@/features/pipeline/hooks/useUpdatePipelineItem'
import { getWhatsAppUrl } from '@/utils/whatsapp'
import { WhatsAppActionMenu } from './WhatsAppActionMenu'
import { MarkAsLostModal } from './MarkAsLostModal'
import { PipelineActivityTimeline } from './PipelineActivityTimeline'
import { LOSS_REASONS } from '@sales-companion/shared'
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
  ChevronLeft,
  MessageSquare,
  LayoutGrid,
  List,
  TrendingUp,
  Banknote,
  Check,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { getPipelineAging } from '@/lib/pipelineAging'
import { formatCompactAmount, formatFullAmount } from '@/lib/formatters'
import { useProspectingCountryDetails } from '@/hooks/useProspectingCountry'

import { UserPipelineKanban } from './UserPipelineKanban'
import { DeadlineBadge } from '@/components/ui/DeadlineBadge'
import { isPendingMigrationDeal } from '@/lib/monthly-cycle'

type PipelineItem = {
  id: string
  companyName: string
  status: string
  companyCity?: string | null
  companyQuarter?: string | null
  companyRegion?: string | null
  quarter?: string | null
  region?: string | null
  country?: string | null
  companyCountry?: string | null
  companySector?: string | null
  companyPhone?: string | null
  companyEmail?: string | null
  phone?: string | null
  email?: string | null
  note?: string | null
  notes?: string | null
  nextAction?: string | null
  nextDate?: string | null
  nextFollowUp?: string | null
  amount?: number | null
  currency?: string | null
  assignedByName?: string | null
  managerUid?: string | null
  sourceId?: string | null
  transferDeadline?: string | null
  assignmentDeadline?: string | null
  firstActionAt?: string | null
  lossReason?: string | null
  lossNotes?: string | null
  lostAt?: string | null
  reactivationDate?: string | null
  previousAssignees?: {
    userId: string
    memberName: string
    assignedAt: string
  }[]
  createdAt?: any
  updatedAt?: any
  assignedAt?: any
  enteredAt?: any
}

type Props = {
  items: PipelineItem[]
  onStatusChange?: (id: string, status: 'prospection' | 'negociation' | 'conclue' | 'perdue') => void
  activeStage?: 'prospection' | 'negociation' | 'conclue' | 'perdue' | null
}

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
  prospection: 'info',
  prospect: 'info',
  negociation: 'warning',
  negotiation: 'warning',
  conclue: 'success',
  conclusion: 'success',
  perdue: 'danger',
  lost: 'danger'
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
  onStatusChange?: (id: string, status: 'prospection' | 'negociation' | 'conclue' | 'perdue') => void
  statusLabel: Record<string, string>
}) {
  const { t, lang } = useTranslation()
  const { currency } = useProspectingCountryDetails()
  const updateMutation = useUpdatePipelineItem()
  const { pushToast } = useToast()

  const [noteText, setNoteText] = useState(item.notes ?? item.note ?? '')
  const [amountVal, setAmountVal] = useState<string>(item.amount != null ? String(item.amount) : '')
  const [followUpVal, setFollowUpVal] = useState<string>(item.nextFollowUp ?? item.nextDate ?? '')
  const [noteSaving, setNoteSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showLostModal, setShowLostModal] = useState(false)

  async function handleSaveNote() {
    setNoteSaving(true)
    try {
      const parsedAmount = amountVal.trim() ? parseFloat(amountVal.replace(/\s+/g, '')) : null
      await updateMutation.mutateAsync({
        id: item.id,
        data: {
          notes: noteText,
          amount: parsedAmount && !isNaN(parsedAmount) ? parsedAmount : null,
          nextFollowUp: followUpVal.trim() || null
        }
      })
      pushToast({
        type: 'success',
        title: t('pipeline.notesSaved') || 'Modifications enregistrées'
      })
      setIsEditing(false)
    } catch {
      pushToast({ type: 'error', title: t('pipeline.notesSaveError') })
    } finally {
      setNoteSaving(false)
    }
  }

  const originalNote = item.notes ?? item.note ?? ''
  const originalAmount = item.amount != null ? String(item.amount) : ''
  const originalFollowUp = item.nextFollowUp ?? item.nextDate ?? ''
  const isChanged =
    noteText !== originalNote || amountVal !== originalAmount || followUpVal !== originalFollowUp

  const filteredPreviousAssignees = (item.previousAssignees || []).filter((pa) => {
    if (item.managerUid && pa.userId === item.managerUid) return false
    if (item.assignedByName && pa.memberName === item.assignedByName) return false
    return true
  })

  const isOverdue = Boolean(
    (item.nextFollowUp || item.nextDate) &&
    (item.nextFollowUp || item.nextDate)! < new Date().toISOString().slice(0, 10) &&
    item.status !== 'conclue' &&
    item.status !== 'conclusion'
  )

  const isConclue = item.status === 'conclue' || item.status === 'conclusion'
  const aging = getPipelineAging(
    item.createdAt || item.enteredAt,
    item.status,
    item.assignedAt,
    item.updatedAt,
    lang
  )

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
            background: 'var(--card, #131c2e)',
            border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
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
                  color: 'var(--foreground, #f1f5f9)',
                  fontFamily: "'Syne', sans-serif",
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em'
                }}
              >
                {item.companyName}
              </h2>
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap'
                }}
              >
                <Badge variant={statusVariant[item.status] ?? 'default'}>
                  {statusLabel[item.status] ?? item.status}
                </Badge>
                <div
                  title={`${lang === 'en' ? 'Entry date:' : "Date d'entrée :"} ${aging.enteredDateFormatted} (${aging.relativeTimeFormatted})`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    background: aging.bgColor,
                    color: aging.color,
                    border: `1px solid ${aging.borderColor}`
                  }}
                >
                  <Clock size={11} />
                  <span>{aging.badgeText}</span>
                </div>
                {aging.warningMessage && (
                  <div
                    title={aging.warningMessage}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      cursor: 'help'
                    }}
                  >
                    <AlertTriangle size={12} style={{ color: '#ef4444' }} />
                    <span>{aging.daysInPipeline}j</span>
                  </div>
                )}
                {item.assignmentDeadline && (
                  <DeadlineBadge
                    deadline={item.assignmentDeadline}
                    status={item.status}
                    firstActionAt={item.firstActionAt}
                  />
                )}
                <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
                  {lang === 'en' ? 'Entered on' : 'Entré le'} {aging.enteredDateFormatted}
                </span>
                {((item as any).pendingMigration === true || isPendingMigrationDeal(item)) && (
                  <div
                    title={
                      lang === 'en'
                        ? 'This deal was closed last month and will be automatically archived to the clients database on the 3rd of this month at 23:59.'
                        : 'Cette affaire a été conclue le mois dernier et sera automatiquement archivée dans la base clients le 3 de ce mois à 23h59.'
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: 'rgba(217, 119, 6, 0.12)',
                      color: '#d97706',
                      border: '1px solid rgba(217, 119, 6, 0.35)'
                    }}
                  >
                    <Clock size={11} />
                    <span>{lang === 'en' ? 'Pending migration J+3' : 'Migration J+3 en attente'}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'var(--secondary, #1e2a3b)',
                border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                cursor: 'pointer',
                color: 'var(--muted-foreground, #94a3b8)',
                padding: 8,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                marginLeft: 16
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'var(--foreground, #f1f5f9)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--secondary, #1e2a3b)'
                e.currentTarget.style.color = 'var(--muted-foreground, #94a3b8)'
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
              background: 'var(--secondary, #1e2a3b)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: 'var(--muted-foreground, #94a3b8)',
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
                  color: 'var(--foreground, #f1f5f9)',
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
              {(item.companyQuarter || item.quarter) && (
                <InfoRow
                  icon={<MapPin size={15} />}
                  label={t('pipeline.quarter') || 'Quartier'}
                  value={(item.companyQuarter || item.quarter)!}
                />
              )}

              {item.companyCity && (
                <InfoRow
                  icon={<MapPin size={15} />}
                  label={t('pipeline.city')}
                  value={item.companyCity}
                />
              )}

              {(item.companyRegion || item.region) && (
                <InfoRow
                  icon={<MapPin size={15} />}
                  label={t('pipeline.region') || 'Région'}
                  value={(item.companyRegion || item.region)!}
                />
              )}

              <InfoRow
                icon={<Phone size={15} />}
                label={t('pipeline.phone')}
                value={
                  item.companyPhone ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <a
                        href={`tel:${item.companyPhone}`}
                        style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {item.companyPhone}
                      </a>
                      <WhatsAppActionMenu
                        phone={item.companyPhone}
                        companyName={item.companyName}
                        contactName={item.companyCity}
                        countryCode={item.country || item.companyCountry}
                      />
                    </div>
                  ) : (
                    <span
                      style={{ color: 'var(--muted-foreground, #64748b)', fontStyle: 'italic' }}
                    >
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
                    <span
                      style={{ color: 'var(--muted-foreground, #64748b)', fontStyle: 'italic' }}
                    >
                      {t('pipeline.notSpecified')}
                    </span>
                  )
                }
              />
            </div>
          </div>

          {/* Assigné par */}
          {item.assignedByName && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--muted-foreground, #94a3b8)',
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
                <strong style={{ color: 'var(--foreground, #f1f5f9)' }}>
                  {item.assignedByName}
                </strong>
              </span>
            </div>
          )}

          {/* Déjà visité / assigné (excluant le Manager) */}
          {filteredPreviousAssignees.length > 0 && (
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
                <strong style={{ display: 'block', marginBottom: 4 }}>
                  {t('pipeline.attention') || 'Attention :'}
                </strong>
                {t('pipeline.previouslyVisitedBy') ||
                  'Cette opportunité a déjà été visitée/assignée précédemment à :'}
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 16, fontSize: 12, opacity: 0.9 }}>
                  {filteredPreviousAssignees.map((pa, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      <strong>{pa.memberName}</strong> (le{' '}
                      {new Date(pa.assignedAt).toLocaleDateString()})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Lost Deal Intelligence Banner */}
          {(item.status === 'perdue' || item.status === 'lost') && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                marginBottom: 16
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#ef4444',
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginBottom: 6
                }}
              >
                <XCircle size={14} />
                <span>{lang === 'en' ? 'Lost Deal Intelligence' : 'Analyse de l’échec'}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--foreground, #f8fafc)', fontWeight: 600 }}>
                {LOSS_REASONS.find((r) => r.id === item.lossReason)?.[lang === 'en' ? 'labelEn' : 'labelFr'] || item.lossReason || (lang === 'en' ? 'Reason not specified' : 'Motif non précisé')}
              </div>
              {item.lossNotes && (
                <p style={{ fontSize: 12, color: 'var(--muted-foreground, #94a3b8)', marginTop: 4, fontStyle: 'italic' }}>
                  "{item.lossNotes}"
                </p>
              )}
              {item.reactivationDate && (
                <div style={{ fontSize: 11.5, color: '#60a5fa', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} />
                  <span>{lang === 'en' ? 'Reactivation scheduled:' : 'Relance prévue :'} {item.reactivationDate}</span>
                </div>
              )}
            </div>
          )}

          {/* Timeline d'activités & Journal terrain (Intègre la valeur de l'offre et l'alerte de durée) */}
          <PipelineActivityTimeline
            pipelineItemId={item.id}
            companyName={item.companyName}
            readOnly={false}
            amount={item.amount}
            currency={currency}
            agingWarning={aging.warningMessage}
            nextFollowUp={item.nextFollowUp ?? item.nextDate}
            notes={item.notes ?? item.note}
            onUpdateAmount={async (newAmount) => {
              await updateMutation.mutateAsync({
                id: item.id,
                data: { amount: newAmount }
              })
              pushToast({
                type: 'success',
                title: lang === 'en' ? 'Offer value updated' : "Valeur de l'offre mise à jour"
              })
            }}
          />

          {/* Status Actions */}
          {onStatusChange && (
            <div
              style={{
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              {/* Option d'échec / Perte (Action négative à gauche, discrète et élégante) */}
              <div>
                {item.status !== 'perdue' && item.status !== 'lost' && (
                  <button
                    type="button"
                    onClick={() => setShowLostModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      background: 'rgba(239, 68, 68, 0.06)',
                      color: '#ef4444',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 150ms ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.14)'
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)'
                    }}
                  >
                    <XCircle size={14} />
                    <span>{lang === 'en' ? 'Mark as Lost' : 'Marquer comme perdue'}</span>
                  </button>
                )}
              </div>

              {/* Progression du Pipeline (Actions d'avancement à droite) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Check size={14} />
                    {t('pipeline.closed')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <MarkAsLostModal
        open={showLostModal}
        item={item}
        onClose={() => setShowLostModal(false)}
        onSuccess={() => {
          setShowLostModal(false)
          onClose()
        }}
      />
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
          background: 'var(--card, #131c2e)',
          borderRadius: 8,
          color: 'var(--muted-foreground, #94a3b8)',
          flexShrink: 0,
          border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`
        }}
      >
        {icon}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            color: 'var(--muted-foreground, #64748b)',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {label}
        </span>
        <span style={{ color: 'var(--foreground, #f1f5f9)', fontWeight: 500, lineHeight: 1.4 }}>
          {value}
        </span>
      </div>
    </div>
  )
}

// ── Main List Component ────────────────────────────────────────────────
export function UserPipelineList({ items, onStatusChange, activeStage }: Props) {
  const { t, lang } = useTranslation()
  const { currency } = useProspectingCountryDetails()
  const deleteMutation = useDeletePipelineItem()

  const statusLabel: Record<string, string> = {
    prospection: t('pipeline.prospection'),
    prospect: t('pipeline.prospection'),
    negociation: t('pipeline.negotiation'),
    negotiation: t('pipeline.negotiation'),
    conclue: t('pipeline.closed'),
    conclusion: t('pipeline.closed'),
    perdue: t('pipeline.lost') || (lang === 'en' ? 'Lost' : 'Perdue'),
    lost: t('pipeline.lost') || (lang === 'en' ? 'Lost' : 'Perdue')
  }
  const { pushToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const [listPage, setListPage] = useState(1)
  const LIST_PAGE_SIZE = 10
  const totalListPages = Math.max(1, Math.ceil(items.length / LIST_PAGE_SIZE))
  const currentListPage = Math.min(listPage, totalListPages)
  const paginatedListItems = items.slice(
    (currentListPage - 1) * LIST_PAGE_SIZE,
    currentListPage * LIST_PAGE_SIZE
  )

  async function confirmDelete() {
    if (!itemToDelete) return
    const id = itemToDelete.id
    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
      pushToast({ type: 'success', title: t('pipeline.deleteSuccess') })
      setItemToDelete(null)
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

      {/* ── View Toggle ── */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex items-center p-1 rounded-xl bg-secondary/60 border border-border/80 shadow-elevation-0">
          {(['kanban', 'list'] as const).map((mode) => {
            const isActive = viewMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ease-standard select-none ${
                  isActive
                    ? 'bg-card text-foreground shadow-elevation-1 border border-border/40'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {mode === 'kanban' ? <LayoutGrid size={13} className={isActive ? 'text-primary' : ''} /> : <List size={13} className={isActive ? 'text-primary' : ''} />}
                <span>{mode === 'kanban' ? 'Kanban' : (t('pipeline.listView') || 'Liste')}</span>
              </button>
            )
          })}
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <UserPipelineKanban
          items={items}
          onStatusChange={onStatusChange!}
          onItemClick={setSelectedItem}
          activeStage={activeStage}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paginatedListItems.map((item) => {
            const accentColor =
              item.status === 'prospection' || item.status === 'prospect'
                ? '#60a5fa'
                : item.status === 'negociation' || item.status === 'negotiation'
                  ? '#fb923c'
                  : '#0284c7'
            const initials = item.companyName
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                style={{
                  background: 'var(--secondary, #1e2a3b)',
                  border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                  borderLeft: `3px solid ${accentColor}`,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${accentColor}66`
                  e.currentTarget.style.background = 'var(--card, #131c2e)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border, rgba(255,255,255,0.1))'
                  e.currentTarget.style.borderLeftColor = accentColor
                  e.currentTarget.style.background = 'var(--secondary, #1e2a3b)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                }}
              >
                {/* Initials avatar */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `${accentColor}18`,
                    border: `1px solid ${accentColor}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 900,
                    color: accentColor,
                    flexShrink: 0,
                    fontFamily: "'Syne', sans-serif",
                    marginLeft: 12
                  }}
                >
                  {initials}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, padding: '14px 0' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 6,
                      flexWrap: 'wrap'
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: 'var(--foreground, #f1f5f9)',
                        fontFamily: "'Syne', sans-serif",
                        letterSpacing: '-0.01em'
                      }}
                    >
                      {item.companyName}
                    </strong>
                    <Badge variant={statusVariant[item.status] ?? 'default'}>
                      {statusLabel[item.status] ?? item.status}
                    </Badge>
                  </div>

                  {/* Chip row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(() => {
                      const aging = getPipelineAging(
                        item.createdAt || item.enteredAt,
                        item.status,
                        item.assignedAt,
                        item.updatedAt,
                        lang
                      )
                      return (
                        <span
                          title={`${lang === 'en' ? 'Entered on' : 'Entré le'} ${aging.enteredDateFormatted} (${aging.relativeTimeFormatted})`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: aging.color,
                            background: aging.bgColor,
                            border: `1px solid ${aging.borderColor}`,
                            borderRadius: 6,
                            padding: '2px 8px'
                          }}
                        >
                          <Clock size={10} />
                          {aging.badgeText}
                        </span>
                      )
                    })()}
                    {((item as any).pendingMigration === true || isPendingMigrationDeal(item)) && (
                      <span
                        title={
                          lang === 'en'
                            ? 'This deal was closed last month and will be automatically archived to the clients database on the 3rd of this month at 23:59.'
                            : 'Cette affaire a été conclue le mois dernier et sera automatiquement archivée dans la base clients le 3 de ce mois à 23h59.'
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#d97706',
                          background: 'rgba(217, 119, 6, 0.10)',
                          border: '1px solid rgba(217, 119, 6, 0.30)',
                          borderRadius: 6,
                          padding: '2px 8px'
                        }}
                      >
                        <Clock size={10} />
                        {lang === 'en' ? 'Pending migration J+3' : 'Migration J+3'}
                      </span>
                    )}
                    {item.companySector && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--muted-foreground, #94a3b8)',
                          background: 'var(--card, #131c2e)',
                          border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                          borderRadius: 6,
                          padding: '2px 8px'
                        }}
                      >
                        <Building2 size={10} style={{ opacity: 0.7 }} />
                        {item.companySector}
                      </span>
                    )}
                    {item.companyCity && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--muted-foreground, #94a3b8)',
                          background: 'var(--card, #131c2e)',
                          border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                          borderRadius: 6,
                          padding: '2px 8px'
                        }}
                      >
                        <MapPin size={10} style={{ opacity: 0.7 }} />
                        {[item.companyQuarter || item.quarter, item.companyCity].filter(Boolean).join(', ') || item.companyCity}
                      </span>
                    )}
                    {item.amount != null && item.amount > 0 && (
                      <span
                        title={`${formatFullAmount(item.amount, lang)} ${currency || 'XAF'}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--pipeline-opportunity-color, #047857)',
                          background: 'var(--pipeline-fresh-bg, #ecfdf5)',
                          border: '1px solid var(--pipeline-fresh-border, rgba(5, 150, 105, 0.25))',
                          borderRadius: 6,
                          padding: '2px 8px'
                        }}
                      >
                        <Banknote size={10} />
                        {formatCompactAmount(item.amount, lang)} {currency || 'XAF'}
                      </span>
                    )}
                    {item.nextFollowUp &&
                      item.status !== 'conclue' &&
                      item.status !== 'conclusion' && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color:
                              item.nextFollowUp < new Date().toISOString().slice(0, 10)
                                ? '#ef4444'
                                : '#60a5fa',
                            background:
                              item.nextFollowUp < new Date().toISOString().slice(0, 10)
                                ? 'rgba(239,68,68,0.08)'
                                : 'rgba(96,165,250,0.08)',
                            border:
                              item.nextFollowUp < new Date().toISOString().slice(0, 10)
                                ? '1px solid rgba(239,68,68,0.25)'
                                : '1px solid rgba(96,165,250,0.2)',
                            borderRadius: 6,
                            padding: '2px 8px'
                          }}
                        >
                          <Calendar size={10} />
                          {item.nextFollowUp}
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
                          color: '#2563eb',
                          background: 'rgba(37,99,235,0.08)',
                          border: '1px solid rgba(37,99,235,0.2)',
                          borderRadius: 6,
                          padding: '2px 8px'
                        }}
                      >
                        <Phone size={10} />
                        {item.companyPhone}
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
                        {t('pipeline.hasNotes')}
                      </span>
                    )}
                    {(item.status === 'perdue' || item.status === 'lost') && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#ef4444',
                          background: 'rgba(239,68,68,0.12)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 6,
                          padding: '2px 8px'
                        }}
                      >
                        <XCircle size={10} />
                        {LOSS_REASONS.find((r) => r.id === item.lossReason)?.[lang === 'en' ? 'labelEn' : 'labelFr'] || (lang === 'en' ? 'Lost' : 'Perdue')}
                      </span>
                    )}
                    {item.assignedByName && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'rgba(139,92,246,0.9)',
                          background: 'rgba(139,92,246,0.08)',
                          border: '1px solid rgba(139,92,246,0.2)',
                          borderRadius: 6,
                          padding: '2px 8px'
                        }}
                      >
                        <User size={10} />
                        {item.assignedByName}
                      </span>
                    )}
                    {item.assignmentDeadline && (
                      <DeadlineBadge
                        deadline={item.assignmentDeadline}
                        status={item.status}
                        firstActionAt={item.firstActionAt}
                      />
                    )}
                    {(() => {
                      const filtered = (item.previousAssignees || []).filter(
                        (pa) =>
                          !(item.managerUid && pa.userId === item.managerUid) &&
                          !(item.assignedByName && pa.memberName === item.assignedByName)
                      )
                      return filtered.length > 0 ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#f87171',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 6,
                            padding: '2px 8px'
                          }}
                        >
                          <AlertTriangle size={10} />
                          {t('pipeline.alreadyVisited') || 'Déjà visité'}
                        </span>
                      ) : null
                    })()}
                  </div>
                </div>

                {/* Arrow + Delete */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    paddingRight: 14,
                    flexShrink: 0
                  }}
                >
                  <ChevronRight
                    size={16}
                    style={{ color: 'var(--muted-foreground, #64748b)', opacity: 0.5 }}
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    loading={deletingId === item.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      setItemToDelete({ id: item.id, name: item.companyName })
                    }}
                    style={{ padding: '0 8px', minHeight: 30 }}
                    title={lang === 'en' ? 'Delete' : 'Supprimer'}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            )
          })}

          {totalListPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--secondary, #1e2a3b)',
                border: '1px solid var(--border, rgba(255,255,255,0.08))'
              }}
            >
              <button
                type="button"
                disabled={currentListPage <= 1}
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  background: 'transparent',
                  color: currentListPage <= 1 ? 'var(--muted-foreground, #64748b)' : 'var(--foreground, #f1f5f9)',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  cursor: currentListPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentListPage <= 1 ? 0.45 : 1
                }}
              >
                <ChevronLeft size={14} />
                <span>{lang === 'en' ? 'Previous' : 'Précédent'}</span>
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground, #94a3b8)', fontWeight: 600 }}>
                Page {currentListPage} / {totalListPages}
              </span>
              <button
                type="button"
                disabled={currentListPage >= totalListPages}
                onClick={() => setListPage((p) => Math.min(totalListPages, p + 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  background: 'transparent',
                  color: currentListPage >= totalListPages ? 'var(--muted-foreground, #64748b)' : 'var(--foreground, #f1f5f9)',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  cursor: currentListPage >= totalListPages ? 'not-allowed' : 'pointer',
                  opacity: currentListPage >= totalListPages ? 0.45 : 1
                }}
              >
                <span>{lang === 'en' ? 'Next' : 'Suivant'}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        title={t('pipeline.confirmDeleteTitle')}
        description={t('pipeline.confirmDeleteDesc', {
          companyName: itemToDelete?.name || ''
        })}
        confirmText={lang === 'en' ? 'Delete' : 'Supprimer'}
        cancelText={lang === 'en' ? 'Cancel' : 'Annuler'}
        variant="danger"
        isLoading={Boolean(deletingId && itemToDelete && deletingId === itemToDelete.id)}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deletingId) setItemToDelete(null)
        }}
      />
    </>
  )
}
