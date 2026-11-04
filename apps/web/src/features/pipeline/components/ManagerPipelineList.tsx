'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Badge, ConfirmDialog, DeadlineBadge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { useDeletePipelineItem } from '@/features/pipeline/hooks/useDeletePipelineItem'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'
import { WhatsAppActionMenu } from './WhatsAppActionMenu'
import { MarkAsLostModal } from './MarkAsLostModal'
import { PipelineActivityTimeline } from './PipelineActivityTimeline'
import { LOSS_REASONS } from '@sales-companion/shared'
import { useUpdatePipelineItem } from '@/features/pipeline/hooks/useUpdatePipelineItem'
import { useExportTeamPerformance } from '@/features/pipeline/hooks/useExportTeamPerformance'
import { exportDashboardPdf } from '../utils/exportDashboardPdf'
import { useOrgReport } from '../hooks/useOrgReport'
import { useTeamTargets, useSaveTeamTarget, useRenewTeamTargets } from '@/features/pipeline/hooks/useTeamTargets'
import { useArchiveLeads } from '@/features/pipeline/hooks/useArchivePipeline'
import { ArchivesDrawer } from '@/features/pipeline/components/ArchivesDrawer'
import { useTransferConcludedDeals } from '@/features/pipeline/hooks/useTransferConcludedDeals'
import { isPendingMigrationDeal } from '@/lib/monthly-cycle'
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  AlertTriangle,
  X,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Save,
  Target,
  Globe,
  BarChart3,
  Banknote,
  Trash2,
  ChevronDown,
  Clock,
  CheckCircle2,
  Check,
  Users,
  Download,
  FolderArchive,
  XCircle,
  FileText,
  RotateCcw
} from 'lucide-react'
import { getPipelineAging } from '@/lib/pipelineAging'
import { formatCompactAmount, formatFullAmount } from '@/lib/formatters'
import { useProspectingCountryDetails } from '@/hooks/useProspectingCountry'

type PipelineItem = {
  id: string
  companyName: string
  status: string
  userId: string
  companyCity?: string | null
  companyQuarter?: string | null
  companyRegion?: string | null
  quarter?: string | null
  region?: string | null
  companySector?: string | null
  companyPhone?: string | null
  companyEmail?: string | null
  phone?: string | null
  email?: string | null
  note?: string | null
  notes?: string | null
  assignedTo?: string | null
  assignedByName?: string | null
  memberName?: string | null // Nom du membre (stocké dans le doc pipeline)
  memberAccessId?: string | null // Access ID du membre (stocké dans le doc pipeline)
  nextFollowUp?: string | null
  amount?: number | null
  currency?: string | null
  transferDeadline?: string | null
  assignmentDeadline?: string | null
  firstActionAt?: string | null
  previousAssignees?: {
    userId: string
    memberName: string
    assignedAt: string
  }[]
  createdAt?: any
  updatedAt?: any
  assignedAt?: any
  enteredAt?: any
  concludedAt?: any
  country?: string | null
  companyCountry?: string | null
  lossReason?: string | null
  lossNotes?: string | null
  lostAt?: string | null
  reactivationDate?: string | null
}

type Member = { uid: string; name?: string; email?: string; accessId?: string }

type Props = {
  items: PipelineItem[]
  members?: Member[]
  managerUid?: string
  showTargets?: boolean
  enableArchive?: boolean  // N'activer que pour le pipeline Team Manager
  isOrgView?: boolean      // Vue Senior Manager : regrouper par TM au lieu de par commercial
  managers?: { uid: string; name?: string; email?: string; isSenior?: boolean }[]
}

/** Résout le nom d'affichage d'un membre pour un item du pipeline */
function resolveMemberLabel(item: PipelineItem, members?: Member[]): string | null {
  if (!item.assignedTo) return null

  // 1. Priorité : nom stocké directement dans le doc pipeline
  if (item.memberName) {
    return item.memberName
  }

  // 2. Fallback : chercher dans la liste des membres actifs
  const m = members?.find((m) => m.uid === item.assignedTo)
  if (m) {
    return m.name || m.email || null
  }

  return null
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

// ── Prospect detail modal ───────────────────────────────────────────────
// ── Prospect detail modal ───────────────────────────────────────────────
function ProspectModal({
  item,
  onClose,
  statusLabel,
  members,
  managerUid,
  isOrgView = false
}: {
  item: PipelineItem
  onClose: () => void
  statusLabel: Record<string, string>
  members?: Member[]
  managerUid?: string
  isOrgView?: boolean
}) {
  const { t, lang } = useTranslation()
  const { currency } = useProspectingCountryDetails()
  const updateMutation = useUpdatePipelineItem()
  const { pushToast } = useToast()
  const [showLostModal, setShowLostModal] = useState(false)

  const originalNote = item.notes ?? item.note ?? ''

  const filteredPreviousAssignees = (item.previousAssignees || []).filter((pa) => {
    if (managerUid && pa.userId === managerUid) return false
    if (item.assignedByName && pa.memberName === item.assignedByName) return false
    return true
  })

  const isOverdue = Boolean(
    item.nextFollowUp &&
    item.nextFollowUp < new Date().toISOString().slice(0, 10) &&
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
                  title={`Date d'entrée : ${aging.enteredDateFormatted} (${aging.relativeTimeFormatted})`}
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
                <span style={{ fontSize: 11, color: 'var(--muted-foreground, #64748b)' }}>
                  {lang === 'en' ? 'Entered on' : 'Entré le'} {aging.enteredDateFormatted}
                </span>
                {((item as any).pendingMigration === true || isPendingMigrationDeal(item)) && (
                  <div
                    title={
                      lang === "en"
                        ? "This deal was closed last month and will be automatically archived to the clients database on the 3rd of this month at 23:59."
                        : "Cette affaire a ete conclue le mois dernier et sera automatiquement archivee dans la base clients le 3 de ce mois a 23h59."
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: "rgba(217, 119, 6, 0.12)",
                      color: "#d97706",
                      border: "1px solid rgba(217, 119, 6, 0.35)"
                    }}
                  >
                    <Clock size={11} />
                    <span>{lang === "en" ? "Pending migration J+3" : "Migration J+3 en attente"}</span>
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
              background: 'var(--secondary, #1e2a3b)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <a
                        href={`tel:${item.companyPhone}`}
                        style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {item.companyPhone}
                      </a>
                      <WhatsAppActionMenu
                        phone={item.companyPhone ?? undefined}
                        companyName={item.companyName}
                        countryCode={item.country ?? item.companyCountry ?? undefined}
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
                <strong style={{ display: 'block', marginBottom: 4 }}>Attention :</strong>
                Ce prospect a déjà été visité/assigné précédemment à :
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

          {/* Bannière Lost Deal Intelligence (si déjà perdue) */}
          {['perdue', 'lost'].includes((item.status || '').toLowerCase()) && item.lossReason && (
            <div
              style={{
                marginBottom: 20,
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                <XCircle size={13} />
                {lang === 'en' ? 'Lost Deal — Failure Analysis' : 'Affaire perdue — Analyse d\'échec'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--foreground, #f1f5f9)', fontWeight: 500 }}>
                {lang === 'en' ? 'Reason:' : 'Motif :'}{' '}
                <strong>
                  {(() => {
                    const LOSS_REASONS_MAP: Record<string, { labelFr: string; labelEn: string }> = {
                      price_too_high: { labelFr: 'Prix trop élevé', labelEn: 'Price too high' },
                      competitor_chosen: { labelFr: 'Concurrent choisi', labelEn: 'Competitor chosen' },
                      budget_cancelled: { labelFr: 'Budget annulé / reporté', labelEn: 'Budget cancelled / postponed' },
                      unreachable: { labelFr: 'Injoignable / faux contact', labelEn: 'Unreachable / invalid contact' },
                      no_need: { labelFr: 'Pas de besoin identifié', labelEn: 'No need identified' },
                      other: { labelFr: 'Autre motif', labelEn: 'Other reason' },
                    }
                    const r = LOSS_REASONS_MAP[item.lossReason!]
                    return r ? (lang === 'en' ? r.labelEn : r.labelFr) : item.lossReason
                  })()}
                </strong>
              </div>
              {item.lossNotes && (
                <div style={{ fontSize: 12, color: 'var(--muted-foreground, #94a3b8)', lineHeight: 1.4 }}>
                  "{item.lossNotes}"
                </div>
              )}
              {item.reactivationDate && (
                <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} />
                  {lang === 'en' ? 'Reactivation planned:' : 'Réactivation prévue :'}{' '}
                  {new Date(item.reactivationDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR')}
                </div>
              )}
            </div>
          )}

          {/* Timeline d'activités & Journal terrain (Lecture seule pour SM et TM) */}
          <PipelineActivityTimeline
            pipelineItemId={item.id}
            companyName={item.companyName}
            readOnly={true}
            amount={item.amount}
            currency={currency}
            agingWarning={aging.warningMessage}
            nextFollowUp={item.nextFollowUp}
            notes={originalNote}
          />

          {/* Actions Footer (Option B : Marquer comme perdue conservé pour le Team Manager, exclu pour le Senior Manager) */}
          {!['perdue', 'lost', 'conclue', 'conclusion', 'won', 'closed'].includes((item.status || '').toLowerCase()) && !isOrgView && (
            <div
              style={{
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>
                {lang === 'en' ? 'Close opportunity' : 'Clôture de l’opportunité'}
              </span>
              <button
                type="button"
                onClick={() => setShowLostModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
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
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.14)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                }}
              >
                <XCircle size={14} />
                <span>{lang === 'en' ? 'Mark as Lost' : 'Marquer comme perdue'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <MarkAsLostModal
        open={showLostModal}
        item={item}
        onClose={() => setShowLostModal(false)}
        onSuccess={() => { setShowLostModal(false); onClose() }}
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

// ── Targets Button (compact trigger + modal) ─────────────────────────────────
function TargetsButton({ members }: { members?: Member[] }) {
  const { t, lang } = useTranslation()
  const { currency } = useProspectingCountryDetails()
  const [open, setOpen] = useState(false)

  // Multi-select: tableau d'UIDs sélectionnés
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Période mois courant par défaut (format YYYY-MM)
  const currentMonth = new Date().toISOString().slice(0, 7) // ex: "2026-11"
  const [period, setPeriod] = useState(currentMonth)
  const [targetVolume, setTargetVolume] = useState('')
  const [targetValue, setTargetValue] = useState('')

  const { data: allTargets } = useTeamTargets()
  const saveMutation = useSaveTeamTarget()
  const renewMutation = useRenewTeamTargets()

  const previousPeriod = useMemo(() => {
    const p = (period || currentMonth).trim()
    const parts = p.split('-')
    const yStr = parts[0]
    const mStr = parts[1]
    if (!yStr || !mStr) return ''
    let y = parseInt(yStr, 10)
    let m = parseInt(mStr, 10)
    if (isNaN(y) || isNaN(m)) return ''
    m -= 1
    if (m === 0) {
      m = 12
      y -= 1
    }
    return `${y}-${String(m).padStart(2, '0')}`
  }, [period, currentMonth])

  const activeMemberIds = useMemo(() => {
    const s = new Set<string>()
    for (const m of members ?? []) {
      if ((m as any).role !== 'support_agent') {
        if (m.uid) s.add(m.uid)
        if (m.accessId) s.add(m.accessId)
      }
    }
    return s
  }, [members])

  // Filtre les objectifs actifs strictement par la période sélectionnée (mois M) et par l'effectif actuel (règle de source de vérité)
  const activeTargets = useMemo(
    () =>
      (allTargets ?? []).filter((t) => {
        const matchesPeriod = t.period === period
        const isCurrentMember = Boolean(t.memberId && activeMemberIds.has(t.memberId))
        return matchesPeriod && isCurrentMember
      }),
    [allTargets, period, activeMemberIds]
  )

  // Objectif global consolidé pour le mois M
  const globalVolume = activeTargets.reduce(
    (acc, t) => (t.targetVolume != null ? acc + t.targetVolume : acc),
    0
  )
  const globalValue = activeTargets.reduce(
    (acc, t) => (t.targetValue != null ? acc + t.targetValue : acc),
    0
  )

  // Pré-remplissage automatique des champs quand un seul membre est sélectionné
  useEffect(() => {
    if (selectedMemberIds.length === 1) {
      const existing = activeTargets.find((t) => t.memberId === selectedMemberIds[0])
      if (existing) {
        setTargetVolume(existing.targetVolume != null ? String(existing.targetVolume) : '')
        setTargetValue(existing.targetValue != null ? String(existing.targetValue) : '')
      } else {
        setTargetVolume('')
        setTargetValue('')
      }
    } else if (selectedMemberIds.length === 0) {
      setTargetVolume('')
      setTargetValue('')
    }
  }, [selectedMemberIds, activeTargets])

  const inputStyle: React.CSSProperties = {
    background: 'var(--secondary, #1e2a3b)',
    border: '1px solid var(--border, rgba(255,255,255,0.1))',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 13,
    color: 'var(--foreground, #f1f5f9)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    color: 'var(--muted-foreground, #94a3b8)',
    marginBottom: 4,
    display: 'block'
  }

  function toggleMember(uid: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    )
  }

  function handleSave() {
    if (selectedMemberIds.length === 0) return
    const volNum = targetVolume ? parseFloat(targetVolume) : null
    const valNum = targetValue ? parseFloat(targetValue.replace(/\s+/g, '')) : null
    // Batch save: une mutation par membre sélectionné
    selectedMemberIds.forEach((uid) => {
      const member = members?.find((m) => m.uid === uid)
      saveMutation.mutate({
        memberId: uid,
        memberName: member?.name ?? member?.email ?? 'Commercial',
        targetVolume: volNum,
        targetValue: valNum,
        period: period.trim() || currentMonth
      })
    })
    setSelectedMemberIds([])
    setTargetVolume('')
    setTargetValue('')
    setDropdownOpen(false)
  }

  // Label du bouton de sélection multiple
  const selectionLabel =
    selectedMemberIds.length === 0
      ? t('pipeline.selectMembersPlaceholder')
      : selectedMemberIds.length === 1
        ? (() => {
            const m = members?.find((mb) => mb.uid === selectedMemberIds[0])
            return m?.name ?? m?.email ?? '1 membre'
          })()
        : lang === 'en'
          ? `${selectedMemberIds.length} members selected`
          : `${selectedMemberIds.length} membres sélectionnés`

  return (
    <>
      {/* Compact trigger button — aligned with ExportButton */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background:
            'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(5,150,105,0.10) 100%)',
          border: '1px solid rgba(16,185,129,0.35)',
          borderRadius: 8,
          padding: '6px 13px',
          cursor: 'pointer',
          color: 'var(--pipeline-concluded-color, #047857)',
          fontWeight: 700,
          fontSize: 12,
          fontFamily: "'Syne',sans-serif",
          transition: 'all 200ms ease',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(16,185,129,0.6)'
          e.currentTarget.style.background =
            'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.18) 100%)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(16,185,129,0.35)'
          e.currentTarget.style.background =
            'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(5,150,105,0.10) 100%)'
        }}
      >
        <Target size={13} />
        {t('pipeline.setTeamTargets')}
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            style={{
              background: 'var(--card, #131c2e)',
              border: '1px solid var(--border, rgba(255,255,255,0.12))',
              borderRadius: 16,
              padding: '24px 26px',
              width: '100%',
              maxWidth: 520,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "'Syne',sans-serif",
                  color: 'var(--foreground, #f1f5f9)'
                }}
              >
                <Target size={16} style={{ color: '#059669' }} />
                {t('pipeline.setTeamTargets')}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted-foreground, #94a3b8)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                  borderRadius: 6
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Objectif Global (R/O) */}
            <div
              style={{
                background: 'rgba(16,185,129,0.07)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px 20px',
                alignItems: 'center'
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--pipeline-concluded-color, #047857)',
                  letterSpacing: '.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <Globe size={12} />
                {t('pipeline.globalTargetRo')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--foreground, #1e293b)' }}>
                {t('pipeline.volLabel')}{' '}
                <strong>
                  {globalVolume > 0
                    ? globalVolume < 10
                      ? `0${globalVolume}`
                      : globalVolume
                    : '00'}
                </strong>{' '}
                {globalVolume === 1 ? t('pipeline.targetLine') : t('pipeline.targetLines')}
              </span>
              <span
                style={{ fontSize: 12, color: 'var(--foreground, #1e293b)' }}
                title={
                  globalValue > 0
                    ? `${formatFullAmount(globalValue, lang)} ${currency || 'XAF'}`
                    : undefined
                }
              >
                {t('pipeline.valLabel')}{' '}
                <strong>
                  {globalValue > 0 ? formatCompactAmount(globalValue, lang) : '00'}
                </strong>{' '}
                {currency || 'XAF'}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--muted-foreground, #64748b)',
                  fontStyle: 'italic',
                  marginLeft: 'auto'
                }}
              >
                {t('pipeline.roCalculated')}
              </span>
            </div>

            {/* ── Multi-select membres ── */}
            <div>
              <label style={labelStyle}>{t('pipeline.teamMembers')}</label>
              {/* Trigger du dropdown custom */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  style={{
                    ...inputStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ color: selectedMemberIds.length === 0 ? 'var(--muted-foreground, #94a3b8)' : 'var(--foreground, #f1f5f9)', fontSize: 13 }}>
                    {selectionLabel}
                  </span>
                  <ChevronDown size={14} style={{ opacity: 0.7, flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
                </button>

                {/* Dropdown list avec checkboxes */}
                {dropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: 'var(--card, #131c2e)',
                      border: '1px solid var(--border, rgba(255,255,255,0.12))',
                      borderRadius: 10,
                      zIndex: 50,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      maxHeight: 220,
                      overflowY: 'auto'
                    }}
                  >
                    {members && members.length > 0 ? members.map((m) => {
                      const checked = selectedMemberIds.includes(m.uid)
                      return (
                        <div
                          key={m.uid}
                          onClick={() => toggleMember(m.uid)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '9px 12px',
                            cursor: 'pointer',
                            background: checked ? 'rgba(16,185,129,0.08)' : 'transparent',
                            borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
                            transition: 'background 120ms'
                          }}
                          onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = checked ? 'rgba(16,185,129,0.08)' : 'transparent' }}
                        >
                          {/* Checkbox custom */}
                          <span
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              border: checked ? '2px solid #10b981' : '2px solid var(--border, rgba(255,255,255,0.2))',
                              background: checked ? '#10b981' : 'transparent',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 120ms'
                            }}
                          >
                            {checked && <Check size={10} color="#fff" strokeWidth={3} />}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--foreground, #f1f5f9)', fontWeight: checked ? 600 : 400 }}>
                            {m.name ?? m.email ?? m.uid}
                          </span>
                          {/* Badge existant objectif */}
                          {activeTargets.find((tg) => tg.memberId === m.uid) && (
                            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#10b981', fontWeight: 600, background: 'rgba(16,185,129,0.12)', padding: '1px 6px', borderRadius: 10 }}>
                              {lang === 'en' ? 'has target' : 'objectif défini'}
                            </span>
                          )}
                        </div>
                      )
                    }) : (
                      <div style={{ padding: '12px', fontSize: 12, color: 'var(--muted-foreground)' }}>
                        {lang === 'en' ? 'No members found' : 'Aucun membre trouvé'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Période : input month pré-rempli mois M ── */}
            <div>
              <label style={labelStyle}>{t('pipeline.targetPeriod')}</label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  ...inputStyle,
                  colorScheme: 'dark'
                }}
              />
            </div>

            {/* Volume + Valeur */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>{t('pipeline.targetVolumeLabel')}</label>
                <input
                  type="number"
                  min={0}
                  placeholder={lang === 'en' ? 'e.g. 50' : 'ex : 50'}
                  value={targetVolume}
                  onChange={(e) => setTargetVolume(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{t('pipeline.targetValueLabel')}</label>
                <input
                  type="number"
                  min={0}
                  placeholder={lang === 'en' ? 'e.g. 5000000' : 'ex : 5 000 000'}
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Objectifs définis pour le mois sélectionné */}
            <div
              style={{
                background: 'var(--secondary, #1e2a3b)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 12
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  gap: 8,
                  flexWrap: 'wrap'
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '.05em',
                    color: 'var(--muted-foreground, #94a3b8)'
                  }}
                >
                  {t('pipeline.definedTargets')}
                </span>
                {previousPeriod && (
                  <button
                    type="button"
                    disabled={renewMutation.isPending}
                    onClick={() => {
                      renewMutation.mutate({
                        fromPeriod: previousPeriod,
                        toPeriod: period || currentMonth,
                        overwrite: true
                      })
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: 'rgba(59,130,246,0.12)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#60a5fa',
                      cursor: renewMutation.isPending ? 'not-allowed' : 'pointer',
                      opacity: renewMutation.isPending ? 0.6 : 1,
                      transition: 'all 150ms'
                    }}
                    title={
                      lang === 'en'
                        ? `Duplicate targets from ${previousPeriod} to ${period || currentMonth}`
                        : `Reconduire les objectifs de ${previousPeriod} vers ${period || currentMonth}`
                    }
                  >
                    <RotateCcw size={11} className={renewMutation.isPending ? 'animate-spin' : ''} />
                    {lang === 'en'
                      ? `Renew from M-1 (${previousPeriod})`
                      : `Reconduire depuis M-1 (${previousPeriod})`}
                  </button>
                )}
              </div>
              {activeTargets.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeTargets.map((tItem) => {
                    const member = members?.find((m) => m.uid === tItem.memberId)
                    const name = member?.name ?? member?.email ?? 'Commercial'
                    return (
                      <div
                        key={tItem.memberId}
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px 12px',
                          alignItems: 'center',
                          padding: '6px 10px',
                          background: 'var(--card, #131c2e)',
                          borderRadius: 8,
                          border: '1px solid var(--border, rgba(255,255,255,0.08))'
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            color: 'var(--foreground, #f1f5f9)',
                            minWidth: 120
                          }}
                        >
                          {name}
                        </span>
                        {tItem.period && (
                          <span
                            style={{
                              color: 'var(--muted-foreground, #94a3b8)',
                              fontSize: 11,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Calendar size={11} />
                            {tItem.period}
                          </span>
                        )}
                        <span style={{ color: '#60a5fa' }}>
                          {t('pipeline.volLabel')}{' '}
                          <strong>
                            {tItem.targetVolume != null && tItem.targetVolume > 0
                              ? tItem.targetVolume < 10
                                ? `0${tItem.targetVolume}`
                                : tItem.targetVolume
                              : '00'}
                          </strong>{' '}
                          {tItem.targetVolume === 1 ? t('pipeline.targetLine') : t('pipeline.targetLines')}
                        </span>
                        <span
                          style={{ color: '#34d399' }}
                          title={
                            tItem.targetValue != null && tItem.targetValue > 0
                              ? `${formatFullAmount(tItem.targetValue, lang)} ${currency || 'XAF'}`
                              : undefined
                          }
                        >
                          {t('pipeline.valLabel')}{' '}
                          <strong>
                            {tItem.targetValue != null && tItem.targetValue > 0
                              ? formatCompactAmount(tItem.targetValue, lang)
                              : '00'}
                          </strong>{' '}
                          {currency || 'XAF'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    color: 'var(--muted-foreground, #94a3b8)',
                    fontSize: 12,
                    fontStyle: 'italic',
                    background: 'var(--card, #131c2e)',
                    borderRadius: 8,
                    border: '1px dashed var(--border, rgba(255,255,255,0.08))'
                  }}
                >
                  {lang === 'en'
                    ? 'No targets defined for this month (Vol. : 00 lines, Val. : 00 XAF)'
                    : 'Aucun objectif défini pour ce mois (Vol. : 00 lignes, Val. : 00 XAF)'}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOpen(false)}
                style={{ fontSize: 12 }}
              >
                {lang === 'en' ? 'Cancel' : 'Annuler'}
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={saveMutation.isPending}
                onClick={() => { handleSave(); setOpen(false) }}
                disabled={selectedMemberIds.length === 0 || saveMutation.isPending}
                style={{
                  background:
                    selectedMemberIds.length === 0
                      ? 'var(--secondary)'
                      : 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  opacity: selectedMemberIds.length === 0 ? 0.5 : 1
                }}
              >
                <Save size={14} style={{ marginRight: 6 }} />
                {t('pipeline.saveTargets')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Export Modal & Button ────────────────────────────────────────────────────────
function ExportButton({
  members,
  managers,
  isOrgView = false
}: {
  members?: Member[]
  managers?: { uid: string; name?: string; email?: string; isSenior?: boolean }[]
  isOrgView?: boolean
}) {
  const { t, lang } = useTranslation()
  const { currency } = useProspectingCountryDetails()
  const { exportPerformance, loading } = useExportTeamPerformance()
  const { data: orgReportData } = useOrgReport()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const activeTeamManagers = managers?.filter((m) => !m.isSenior) ?? []

  const inputStyle: React.CSSProperties = {
    background: 'var(--secondary, #1e2a3b)',
    border: '1px solid var(--border, rgba(255,255,255,0.1))',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 13,
    color: 'var(--foreground, #f1f5f9)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    color: 'var(--muted-foreground, #94a3b8)',
    marginBottom: 4,
    display: 'block'
  }

  return (
    <>
      {/* Trigger compact */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--border, rgba(255,255,255,0.12))',
          background: 'var(--secondary, #1e2a3b)',
          color: 'var(--foreground, #f1f5f9)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 150ms ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
          e.currentTarget.style.background = 'var(--card, #131c2e)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border, rgba(255,255,255,0.12))'
          e.currentTarget.style.background = 'var(--secondary, #1e2a3b)'
        }}
      >
        <BarChart3 size={14} style={{ color: '#818cf8' }} />
        <span>{t('pipeline.exportPerformances')}</span>
      </button>

      {/* Modal 100% opaque */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(3px)'
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
              padding: 16,
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                background: 'var(--card, #131c2e)',
                border: '1px solid var(--border, rgba(255,255,255,0.15))',
                borderRadius: 14,
                width: '100%',
                maxWidth: 480,
                padding: 24,
                pointerEvents: 'auto',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={18} style={{ color: '#818cf8' }} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--foreground, #f1f5f9)' }}>
                    {t('pipeline.exportPerformances')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted-foreground, #94a3b8)',
                    cursor: 'pointer',
                    padding: 4
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ fontSize: 13, color: 'var(--muted-foreground, #94a3b8)', lineHeight: 1.5 }}>
                {isOrgView ? t('pipeline.exportDescTM') : t('pipeline.exportDesc')}
              </div>

              {/* Filter: Team Managers for SM, Salespeople for TM */}
              <div>
                <label style={labelStyle}>
                  {isOrgView ? t('pipeline.filterTM') : t('pipeline.filterSalesperson')}
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">
                    {isOrgView ? t('pipeline.allTMs') : t('pipeline.allSalespeople')}
                  </option>
                  {isOrgView
                    ? activeTeamManagers.map((m) => (
                        <option key={m.uid} value={m.uid}>
                          {m.name ?? m.email ?? m.uid}
                        </option>
                      ))
                    : members?.map((m) => (
                        <option key={m.uid} value={m.uid}>
                          {m.name ?? m.email ?? m.uid}
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
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedId('')
                    setFrom('')
                    setTo('')
                  }}
                >
                  {t('pipeline.exportReset')}
                </Button>
                {isOrgView && orgReportData && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const activePeriod = orgReportData.monthlyCycle?.currentPeriod
                      const buildDateLabel = (d: string, opts: Intl.DateTimeFormatOptions) =>
                        new Date(d).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', opts)
                      const monthYearOpts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }
                      const periodLabel = (from || to)
                        ? from && to
                          ? `${buildDateLabel(from, monthYearOpts)} – ${buildDateLabel(to, monthYearOpts)}`
                          : from
                            ? (lang === 'en' ? `From ${buildDateLabel(from, monthYearOpts)}` : `Depuis ${buildDateLabel(from, monthYearOpts)}`)
                            : (lang === 'en' ? `Until ${buildDateLabel(to, monthYearOpts)}` : `Jusqu'à ${buildDateLabel(to, monthYearOpts)}`)
                        : lang === 'en' ? (activePeriod?.labelEn || 'Current') : (activePeriod?.labelFr || 'En cours')
                      exportDashboardPdf({
                        data: orgReportData,
                        seniorManagerName: managers?.find((m) => m.isSenior)?.name,
                        periodLabel,
                        currency,
                        lang
                      })
                      setOpen(false)
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      borderColor: '#10b981',
                      color: '#10b981'
                    }}
                  >
                    <FileText size={14} />
                    <span>{lang === 'en' ? 'Executive PDF (Board)' : 'Rapport Bilan PDF (DG)'}</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  loading={loading}
                  onClick={async () => {
                    await exportPerformance({
                      managerId: isOrgView ? (selectedId || undefined) : undefined,
                      memberId: !isOrgView ? (selectedId || undefined) : undefined,
                      from: from || undefined,
                      to: to || undefined
                    })
                    setOpen(false)
                  }}
                >
                  <Download size={14} className="mr-1.5" /> {t('pipeline.exportDownload')}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export function ManagerPipelineList({ items, members, managerUid, showTargets = true, enableArchive = false, isOrgView = false, managers }: Props) {
  const { t, lang } = useTranslation()
  const { currency } = useProspectingCountryDetails()
  const deleteMutation = useDeletePipelineItem()
  const { archiveLeads, loading: archiving } = useArchiveLeads()

  const statusLabel: Record<string, string> = {
    prospection: t('pipeline.prospection'),
    prospect: t('pipeline.prospection'),
    negociation: t('pipeline.negotiation'),
    negotiation: t('pipeline.negotiation'),
    conclue: t('pipeline.closed'),
    conclusion: t('pipeline.closed'),
    perdue: lang === 'en' ? 'Lost' : 'Perdue',
    lost: lang === 'en' ? 'Lost' : 'Perdue'
  }
  const { pushToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)

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

  // Group by normalized status
  const normalize = (s: string) => {
    const st = (s || '').toLowerCase().trim()
    if (['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead'].includes(st))
      return 'prospection'
    if (['negociation', 'negotiation', 'in_progress', 'en_cours'].includes(st)) return 'negociation'
    if (['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(st)) return 'conclue'
    return 'prospection'
  }

  // Fix: use isMounted to guarantee identical HTML between SSR and client initial hydration (React error #418)
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ── Sélection pour archivage ──────────────────────────────────────────────
  const [selectedForArchive, setSelectedForArchive] = useState<Set<string>>(new Set())

  const toggleArchiveSelect = useCallback((id: string) => {
    setSelectedForArchive((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  async function handleArchiveSelected() {
    const ids = Array.from(selectedForArchive)
    await archiveLeads(ids)
    setSelectedForArchive(new Set())
  }

  // ── Transfert manuel vers la base clients en fin de mois ──────────────────
  const transferMutation = useTransferConcludedDeals()
  const [transferringItems, setTransferringItems] = useState<PipelineItem[] | null>(null)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)

  // Le bouton ne devient visible que à la fin du mois :
  // soit les 4 derniers jours du mois calendaire, soit jusqu'au 3 du mois suivant (inclus)
  const isEndOfMonthPeriod = useMemo(() => {
    if (!isMounted) return false
    const now = new Date()
    const day = now.getDate()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return day >= lastDay - 3 || day <= 3
  }, [isMounted])

  const handleOpenTransferModal = useCallback((itemsToTransfer: PipelineItem[]) => {
    if (!itemsToTransfer || itemsToTransfer.length === 0) return
    setTransferringItems(itemsToTransfer)
    setIsTransferModalOpen(true)
  }, [])

  const handleConfirmTransfer = useCallback(async () => {
    if (!transferringItems || transferringItems.length === 0) return
    try {
      const res = await transferMutation.mutateAsync({
        itemIds: transferringItems.map((i) => i.id)
      })
      pushToast({
        type: 'success',
        title: t('pipeline.transferSuccess', { count: res.transferredCount ?? transferringItems.length })
      })
    } catch (err: any) {
      pushToast({
        type: 'error',
        title: err?.message || 'Erreur lors du transfert vers la base clients'
      })
    } finally {
      setIsTransferModalOpen(false)
      setTransferringItems(null)
    }
  }, [transferringItems, transferMutation, pushToast, t])

  // ── Filtre par membre & statistiques individuelles ──────────────────────────
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all')
  const { data: allTargets } = useTeamTargets()

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  type MemberSummary = {
    uid: string
    name: string
    email?: string
    accessId?: string
    totalCount: number
    prospectionCount: number
    negociationCount: number
    conclueCount: number
    overdueCount: number
    activePipelineAmount: number
    totalAmount: number
    concludedAmount: number
  }

  // Bornes du mois courant pour filtrer les réalisations (seules les affaires conclues dans le mois M comptent)
  const periodBounds = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1 // 1-indexed
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
    const end = new Date(year, month, 0, 23, 59, 59, 999)
    return { start, end }
  }, [])

  const { memberSummaries, unassignedCount, activeMemberSummary } = useMemo(() => {
    const map = new Map<string, MemberSummary>()

    if (isOrgView) {
      // Vue SM : regrouper STRICTEMENT par Team Manager.
      // INVARIANT MÉTIER CRITIQUE : Le Senior Manager n'est PAS un Team Manager !
      // Ses leads éventuels sont neutres (non assignés) et masqués dans cette vue.
      let unassigned = 0

      for (const item of items) {
        const tmUid = (item as any).managerUid as string | undefined
        const isSeniorLead =
          (item as any).managerOrgRole === 'senior_manager' ||
          Boolean(managerUid && tmUid === managerUid)

        if (isSeniorLead) {
          // Les leads SM sont masqués de la vue consolidée TM — comptés comme non assignés
          unassigned++
          continue
        }

        if (!tmUid) { unassigned++; continue }
        let summary = map.get(tmUid)
        if (!summary) {
          summary = {
            uid: tmUid,
            name: (item as any).managerName || tmUid,
            totalCount: 0,
            prospectionCount: 0,
            negociationCount: 0,
            conclueCount: 0,
            overdueCount: 0,
            activePipelineAmount: 0,
            totalAmount: 0,
            concludedAmount: 0
          }
          map.set(tmUid, summary)
        }
        const amt = Number(item.amount) || 0
        summary.totalCount++
        const st = normalize(item.status)
        if (st === 'prospection') {
          summary.prospectionCount++
          summary.activePipelineAmount += amt
        } else if (st === 'negociation') {
          summary.negociationCount++
          summary.activePipelineAmount += amt
        } else if (st === 'conclue') {
          const rawDate = (item as any).concludedAt ?? item.updatedAt
          const concludedDate = rawDate ? new Date(rawDate as string) : null
          const inPeriod =
            Boolean(concludedDate) &&
            !isNaN(concludedDate!.getTime()) &&
            concludedDate! >= periodBounds.start &&
            concludedDate! <= periodBounds.end
          if (inPeriod) {
            summary.conclueCount++
            summary.concludedAmount += amt
          }
        }
        summary.totalAmount += amt
        if (item.nextFollowUp && item.nextFollowUp < todayStr && st !== 'conclue') {
          summary.overdueCount++
        }
      }
      const list = Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount)

      const active =
        selectedMemberId !== 'all' && selectedMemberId !== 'unassigned'
          ? map.get(selectedMemberId) ?? null
          : null

      return {
        memberSummaries: list,
        unassignedCount: unassigned,
        activeMemberSummary: active
      }
    }

    // Vue TM : regrouper par assignedTo (commercial)
    // Initialiser avec les membres commerciaux connus de l'équipe (exclure support_agent)
    for (const m of members || []) {
      if ((m as any).role === 'support_agent') continue
      map.set(m.uid, {
        uid: m.uid,
        name: m.name || m.email || m.accessId || 'Commercial',
        email: m.email,
        accessId: m.accessId,
        totalCount: 0,
        prospectionCount: 0,
        negociationCount: 0,
        conclueCount: 0,
        overdueCount: 0,
        activePipelineAmount: 0,
        totalAmount: 0,
        concludedAmount: 0
      })
    }

    let unassigned = 0

    for (const item of items) {
      const isAssigned = item.assignedTo && item.assignedTo !== managerUid
      if (!isAssigned) {
        unassigned++
        continue
      }

      // Seuls les membres ACTUELS de l'équipe sont comptabilisés dans les membres
      const summary = map.get(item.assignedTo!)
      if (!summary) {
        // Le commercial assigné ne fait plus partie de l'équipe :
        // Les opportunités actives basculent dans les non assignés à reprendre par l'équipe
        unassigned++
        continue
      }

      const amt = Number(item.amount) || 0
      summary.totalCount++
      const st = normalize(item.status)
      if (st === 'prospection') {
        summary.prospectionCount++
        summary.activePipelineAmount += amt
      } else if (st === 'negociation') {
        summary.negociationCount++
        summary.activePipelineAmount += amt
      } else if (st === 'conclue') {
        const rawDate = (item as any).concludedAt ?? item.updatedAt
        const concludedDate = rawDate ? new Date(rawDate as string) : null
        const inPeriod =
          Boolean(concludedDate) &&
          !isNaN(concludedDate!.getTime()) &&
          concludedDate! >= periodBounds.start &&
          concludedDate! <= periodBounds.end
        if (inPeriod) {
          summary.conclueCount++
          summary.concludedAmount += amt
        }
      }

      summary.totalAmount += amt

      if (item.nextFollowUp && item.nextFollowUp < todayStr && st !== 'conclue') {
        summary.overdueCount++
      }
    }

    const list = Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount)
    const active =
      selectedMemberId !== 'all' && selectedMemberId !== 'unassigned'
        ? map.get(selectedMemberId) ?? null
        : null

    return {
      memberSummaries: list,
      unassignedCount: unassigned,
      activeMemberSummary: active
    }
  }, [items, members, managerUid, todayStr, selectedMemberId, isOrgView, periodBounds])

  // Fiches filtrées selon le TM (isOrgView) ou le commercial (TM view) sélectionné
  const displayedItems = useMemo(() => {
    if (selectedMemberId === 'all') {
      if (isOrgView) {
        // En vue organisation "Tous les Team Managers" :
        // Les leads non assignés du SM ne doivent pas être visibles ici (uniquement dans l'onglet "Non assignés")
        return items.filter((i) => {
          const isSeniorLead =
            (i as any).managerOrgRole === 'senior_manager' ||
            Boolean(managerUid && (i as any).managerUid === managerUid)
          return !isSeniorLead
        })
      }
      return items
    }
    if (selectedMemberId === 'unassigned') {
      if (isOrgView) {
        // Vue SM : les leads du SM lui-même + leads sans TM assigné
        return items.filter(
          (i) =>
            (i as any).managerOrgRole === 'senior_manager' ||
            Boolean(managerUid && (i as any).managerUid === managerUid) ||
            !(i as any).managerUid
        )
      }
      return items.filter((i) => !i.assignedTo || i.assignedTo === managerUid)
    }
    if (isOrgView) {
      // En vue SM : filtrer par managerUid (Team Manager)
      return items.filter((i) => (i as any).managerUid === selectedMemberId)
    }
    return items.filter((i) => i.assignedTo === selectedMemberId)
  }, [items, selectedMemberId, managerUid, isOrgView])

  const grouped: Record<string, PipelineItem[]> = useMemo(() => ({
    prospection: displayedItems.filter((i) => normalize(i.status) === 'prospection'),
    negociation: displayedItems.filter((i) => normalize(i.status) === 'negociation'),
    conclue: displayedItems.filter((i) => normalize(i.status) === 'conclue')
  }), [displayedItems])

  const activeTarget = useMemo(() => {
    if (!activeMemberSummary) return null
    if (isOrgView) {
      // Pour un Team Manager en vue organisation : agréger les objectifs des membres de son équipe
      const tmTargets = (allTargets ?? []).filter(
        (t) => t.managerUid === activeMemberSummary.uid
      )
      if (tmTargets.length > 0) {
        const totalVolume = tmTargets.reduce((acc, t) => acc + (t.targetVolume ?? 0), 0)
        const totalValue = tmTargets.reduce((acc, t) => acc + (t.targetValue ?? 0), 0)
        const period = tmTargets.find((t) => t.period)?.period ?? null
        return {
          memberId: activeMemberSummary.uid,
          targetVolume: totalVolume > 0 ? totalVolume : null,
          targetValue: totalValue > 0 ? totalValue : null,
          period
        }
      }
      // Fallback si un objectif direct a été assigné au Team Manager
      return (allTargets ?? []).find((t) => t.memberId === activeMemberSummary.uid) ?? null
    }
    return (allTargets ?? []).find((t) => t.memberId === activeMemberSummary.uid) ?? null
  }, [allTargets, activeMemberSummary, isOrgView])

  if (!items.length) return null

  return (
    <>
      {selectedItem && (
        <ProspectModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          statusLabel={statusLabel}
          members={members}
          managerUid={managerUid}
          isOrgView={isOrgView}
        />
      )}

      {/* ── Panneau d'archivage — TM uniquement, s'affiche quand des leads sont sélectionnés ── */}
      {enableArchive && selectedForArchive.size > 0 && (
        <div
          className="mb-3 px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 flex items-center gap-3 flex-wrap shadow-xs"
        >
          <span className="text-[13px] font-bold text-amber-900 dark:text-amber-300 flex-1">
            {selectedForArchive.size} lead{selectedForArchive.size > 1 ? 's sélectionnés' : ' sélectionné'} pour archivage
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedForArchive(new Set())}
            style={{ fontSize: 12 }}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={archiving}
            onClick={() => void handleArchiveSelected()}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              fontSize: 12,
              fontWeight: 700
            }}
          >
            Archiver la sélection
          </Button>
        </div>
      )}

      {/* ── Sélecteur d'activité individuelle par commercial (Team Manager uniquement, masqué en vue Org SM) ───────────── */}
      {!isOrgView && (
        <div
          className="pipeline-member-filter-sticky"
          style={{
            marginBottom: 16,
            background: 'var(--card, #131c2e)',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}
        >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            gap: 8,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} style={{ color: '#818cf8' }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'var(--foreground, #f1f5f9)'
              }}
            >
              {isOrgView ? t('pipeline.pipelineByTM') : t('pipeline.pipelineByMember')}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground, #94a3b8)' }}>
              ({isOrgView
                ? t('pipeline.teamManagerCount', { count: memberSummaries.length })
                : t('pipeline.memberCount', { count: memberSummaries.length })})
            </span>

          </div>

          {selectedMemberId !== 'all' && (
            <button
              onClick={() => setSelectedMemberId('all')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#818cf8',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px'
              }}
            >
              <X size={11} />
              {isOrgView ? t('pipeline.seeAllTMs') : t('pipeline.seeAllTeam')}
            </button>
          )}
        </div>

        {/* ── Barre de filtre membres ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap'
          }}
        >
          {/* Pill : Toute l'équipe / Tous les TMs */}
          <button
            type="button"
            onClick={() => setSelectedMemberId('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border:
                selectedMemberId === 'all'
                  ? '1px solid #6366f1'
                  : '1px solid var(--border, rgba(255,255,255,0.1))',
              background: selectedMemberId === 'all' ? '#6366f1' : 'var(--secondary, #1e2a3b)',
              color: selectedMemberId === 'all' ? '#ffffff' : 'var(--foreground, #f1f5f9)',
              transition: 'all 150ms ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0
            }}
          >
            <span>{isOrgView ? t('pipeline.allTMs') : t('pipeline.allTeam')}</span>
            {!isOrgView && (
              <span
                style={{
                  fontSize: 10.5,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background:
                    selectedMemberId === 'all'
                      ? 'rgba(255,255,255,0.25)'
                      : 'rgba(255,255,255,0.08)',
                  fontWeight: 700
                }}
              >
                {items.length}
              </span>
            )}
          </button>

          {/* Pill : Non assignés */}
          {unassignedCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedMemberId('unassigned')}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border:
                  selectedMemberId === 'unassigned'
                    ? '1px solid #f59e0b'
                    : '1px solid var(--border, rgba(255,255,255,0.1))',
                background:
                  selectedMemberId === 'unassigned' ? '#f59e0b' : 'var(--secondary, #1e2a3b)',
                color:
                  selectedMemberId === 'unassigned' ? '#ffffff' : 'var(--foreground, #f1f5f9)',
                transition: 'all 150ms ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0
              }}
            >
              <span>{t('pipeline.unassigned')}</span>
              <span
                style={{
                  fontSize: 10.5,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background:
                    selectedMemberId === 'unassigned'
                      ? 'rgba(255,255,255,0.25)'
                      : 'rgba(255,255,255,0.08)',
                  fontWeight: 700
                }}
              >
                {unassignedCount}
              </span>
            </button>
          )}

          {/* Dropdown : Filtrer par TM (SM) ou par commercial (TM) */}
          {memberSummaries.length > 0 && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <select
                value={
                  selectedMemberId === 'all' || selectedMemberId === 'unassigned'
                    ? ''
                    : selectedMemberId
                }
                onChange={(e) => {
                  if (e.target.value) setSelectedMemberId(e.target.value)
                }}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  height: 34,
                  paddingLeft: 12,
                  paddingRight: 32,
                  borderRadius: 20,
                  border:
                    selectedMemberId !== 'all' && selectedMemberId !== 'unassigned'
                      ? '1px solid #6366f1'
                      : '1px solid var(--border, rgba(255,255,255,0.12))',
                  background:
                    selectedMemberId !== 'all' && selectedMemberId !== 'unassigned'
                      ? '#6366f1'
                      : 'var(--secondary, #1e2a3b)',
                  color:
                    selectedMemberId !== 'all' && selectedMemberId !== 'unassigned'
                      ? '#ffffff'
                      : 'var(--foreground, #f1f5f9)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: 200,
                  transition: 'all 150ms ease'
                }}
              >
                {(selectedMemberId === 'all' || selectedMemberId === 'unassigned') && (
                  <option value="" disabled>
                    {isOrgView ? t('pipeline.filterByTM') : t('pipeline.filterByMember')}
                  </option>
                )}
                {isOrgView ? (
                  <>
                    {memberSummaries.length > 0 && (
                      <optgroup label={t('pipeline.orgTeamManagers')}>
                        {memberSummaries.map((m) => {
                          const warn = m.overdueCount > 0 ? ` (${t('pipeline.overdueBadge', { count: m.overdueCount })})` : ''
                          return (
                            <option key={m.uid} value={m.uid}>
                              {m.name}{warn}
                            </option>
                          )
                        })}
                      </optgroup>
                    )}

                  </>
                ) : (
                  memberSummaries.map((m) => {
                    const warn = m.overdueCount > 0 ? ` (${t('pipeline.overdueBadge', { count: m.overdueCount })})` : ''
                    return (
                      <option key={m.uid} value={m.uid}>
                        {m.name} — {m.totalCount} {m.totalCount > 1 ? t('pipeline.leads') : t('pipeline.lead')}{warn}
                      </option>
                    )
                  })
                )}
              </select>
              <span
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color:
                    selectedMemberId !== 'all' && selectedMemberId !== 'unassigned'
                      ? 'rgba(255,255,255,0.8)'
                      : 'var(--muted-foreground, #94a3b8)',
                  fontSize: 11,
                  lineHeight: 1
                }}
              >
                ▾
              </span>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── Bannière d'activité détaillée du membre sélectionné ─────────── */}
      {!isOrgView && activeMemberSummary && (
        <div
          style={{
            marginBottom: 20,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}
        >
          {/* Header du membre */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: '0 2px 8px rgba(99,102,241,0.4)'
                }}
              >
                {activeMemberSummary.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--foreground, #f1f5f9)'
                    }}
                  >
                    {activeMemberSummary.name}
                  </h4>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--muted-foreground, #94a3b8)',
                    marginTop: 2
                  }}
                >
                  {isOrgView
                    ? t('pipeline.supervisedByTM')
                    : t('pipeline.assignedToMember')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!isOrgView && isEndOfMonthPeriod && activeMemberSummary.conclueCount > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenTransferModal(grouped.conclue ?? [])}
                  disabled={transferMutation.isPending}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: transferMutation.isPending ? 'not-allowed' : 'pointer',
                    transition: 'all 150ms ease'
                  }}
                >
                  <FolderArchive size={12} />
                  <span>
                    {t('pipeline.transferToClients')} ({activeMemberSummary.conclueCount})
                  </span>
                </button>
              )}
              <button
                onClick={() => setSelectedMemberId('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'var(--secondary, #1e2a3b)',
                  color: 'var(--muted-foreground, #94a3b8)',
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
              >
                {isOrgView ? t('pipeline.showAllTMs') : t('pipeline.showAllTeam')}
              </button>
            </div>
          </div>

          {/* Grille des 4 métriques clés */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12
            }}
          >
            {/* 1. Portefeuille actif */}
            <div
              style={{
                background: 'var(--card, #131c2e)',
                borderRadius: 10,
                padding: '10px 14px',
                border: '1px solid var(--border, rgba(255,255,255,0.08))'
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--pipeline-progress-color, #1d4ed8)',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <TrendingUp size={12} />
                {t('pipeline.activePortfolio')}
              </div>
              <div
                style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground, #f1f5f9)' }}
              >
                {activeMemberSummary.prospectionCount + activeMemberSummary.negociationCount}{' '}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--muted-foreground, #64748b)'
                  }}
                >
                  {activeMemberSummary.prospectionCount + activeMemberSummary.negociationCount > 1 ? t('pipeline.leads') : t('pipeline.lead')}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted-foreground, #64748b)',
                  fontWeight: 500,
                  marginTop: 2
                }}
              >
                {activeMemberSummary.prospectionCount} {t('pipeline.inProspectionShort')} ·{' '}
                {activeMemberSummary.negociationCount} {t('pipeline.inNegoShort')}
              </div>
            </div>

            {/* 2. Valeur du pipeline (deals actifs en cours) */}
            <div
              style={{
                background: 'var(--card, #131c2e)',
                borderRadius: 10,
                padding: '10px 14px',
                border: '1px solid var(--border, rgba(255,255,255,0.08))'
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--pipeline-warning-color, #b45309)',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <Banknote size={12} />
                {t('pipeline.pipelineValueLabel')}
              </div>
              <div
                title={`${formatFullAmount(activeMemberSummary.activePipelineAmount, lang)} ${currency || 'XAF'}`}
                style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground, #f1f5f9)' }}
              >
                {formatCompactAmount(
                  activeMemberSummary.activePipelineAmount,
                  lang
                )}{' '}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--muted-foreground, #64748b)'
                  }}
                >
                  {currency || 'XAF'}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted-foreground, #64748b)',
                  fontWeight: 500,
                  marginTop: 2
                }}
              >
                {activeMemberSummary.prospectionCount} {t('pipeline.inProspectionShort')} ·{' '}
                {activeMemberSummary.negociationCount} {t('pipeline.inNegoShort')}
              </div>
            </div>

            {/* 3. Relances & Vigilance */}
            <div
              style={{
                background: 'var(--card, #131c2e)',
                borderRadius: 10,
                padding: '10px 14px',
                border:
                  activeMemberSummary.overdueCount > 0
                    ? '1px solid rgba(239,68,68,0.3)'
                    : '1px solid var(--border, rgba(255,255,255,0.08))'
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: activeMemberSummary.overdueCount > 0 ? 'var(--pipeline-alert-color, #b91c1c)' : 'var(--pipeline-progress-color, #1d4ed8)',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <Calendar size={12} />
                {t('pipeline.followUpsAndTracking')}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: activeMemberSummary.overdueCount > 0 ? 'var(--pipeline-alert-color, #b91c1c)' : 'var(--pipeline-concluded-color, #047857)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7
                }}
              >
                {activeMemberSummary.overdueCount > 0 ? (
                  <>
                    <span>{t('pipeline.overdueBadge', { count: activeMemberSummary.overdueCount })}</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        background: 'rgba(239, 68, 68, 0.16)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#ef4444'
                      }}
                    >
                      <AlertTriangle size={12} strokeWidth={2.5} />
                    </span>
                  </>
                ) : (
                  <>
                    <span>{t('pipeline.upToDate')}</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        background: '#10b981',
                        color: '#ffffff',
                        boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <Check size={13} strokeWidth={3} />
                    </span>
                  </>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted-foreground, #94a3b8)',
                  marginTop: 2
                }}
              >
                {activeMemberSummary.overdueCount > 0
                  ? t('pipeline.urgentFollowUpRequired')
                  : t('pipeline.noExpiredFollowUps')}
              </div>
            </div>

            {/* 4. Objectifs fixés */}
            {(() => {

              const hasTargets =
                activeTarget &&
                (activeTarget.targetVolume != null || activeTarget.targetValue != null)

              const pctVolume =
                activeTarget?.targetVolume != null && activeTarget.targetVolume > 0
                  ? Math.round((activeMemberSummary.conclueCount / activeTarget.targetVolume) * 100)
                  : null

              const pctValue =
                activeTarget?.targetValue != null && activeTarget.targetValue > 0
                  ? Math.round((activeMemberSummary.concludedAmount / activeTarget.targetValue) * 100)
                  : null

              const roValue: number | null = (() => {
                if (pctVolume != null && pctValue != null)
                  return Math.round((pctVolume + pctValue) / 2)
                if (pctVolume != null) return pctVolume
                if (pctValue != null) return pctValue
                return null
              })()

              const getScoreColor = (score: number | null) => {
                if (score == null) return 'var(--muted-foreground, #64748b)'
                if (score >= 100) return 'var(--pipeline-concluded-color, #047857)'
                if (score >= 75) return 'var(--pipeline-warning-color, #b45309)'
                return 'var(--pipeline-alert-color, #b91c1c)'
              }

              return (
                <div
                  style={{
                    background: 'var(--card, #131c2e)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    border: '1px solid var(--border, rgba(255,255,255,0.08))',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--pipeline-warning-color, #b45309)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Target size={12} />
                      {isOrgView ? t('pipeline.setTeamTargets') : t('pipeline.definedTargets')}{' '}
                      {activeTarget?.period ? `(${activeTarget.period})` : ''}
                    </div>
                    {roValue != null && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '1px 7px',
                          borderRadius: 6,
                          background:
                            roValue >= 100
                              ? 'rgba(16,185,129,0.12)'
                              : roValue >= 75
                                ? 'rgba(217,119,6,0.12)'
                                : 'rgba(239,68,68,0.12)',
                          border: `1px solid ${
                            roValue >= 100
                              ? 'rgba(16,185,129,0.35)'
                              : roValue >= 75
                                ? 'rgba(217,119,6,0.35)'
                                : 'rgba(239,68,68,0.35)'
                          }`,
                          color: getScoreColor(roValue)
                        }}
                      >
                        R/O {roValue}%
                      </span>
                    )}
                  </div>

                  {hasTargets ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {/* 1. Volume avec pourcentage */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 11.5
                        }}
                      >
                        <span style={{ color: 'var(--muted-foreground, #64748b)', fontWeight: 600 }}>{t('pipeline.volumeLabel')} :</span>
                        <span style={{ fontWeight: 700, color: 'var(--foreground, #f1f5f9)' }}>
                          {activeMemberSummary.conclueCount} / {activeTarget.targetVolume != null && activeTarget.targetVolume > 0 ? (activeTarget.targetVolume < 10 ? `0${activeTarget.targetVolume}` : activeTarget.targetVolume) : '00'}{' '}
                          {pctVolume != null && (
                            <strong style={{ color: getScoreColor(pctVolume) }}>
                              ({pctVolume}%)
                            </strong>
                          )}
                        </span>
                      </div>

                      {/* 2. Valeur avec pourcentage */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 11.5
                        }}
                      >
                        <span style={{ color: 'var(--muted-foreground, #64748b)', fontWeight: 600 }}>{t('pipeline.dealValue')}</span>
                        <span
                          style={{ fontWeight: 700, color: 'var(--foreground, #f1f5f9)' }}
                          title={`${formatFullAmount(activeMemberSummary.concludedAmount, lang)} / ${activeTarget.targetValue != null ? formatFullAmount(activeTarget.targetValue, lang) : ''} ${currency || 'XAF'}`}
                        >
                          {formatCompactAmount(activeMemberSummary.concludedAmount, lang)}
                          {activeTarget.targetValue != null
                            ? ` / ${formatCompactAmount(activeTarget.targetValue, lang)} ${currency || 'XAF'}`
                            : ` ${currency || 'XAF'}`}
                          {pctValue != null && (
                            <strong style={{ marginLeft: 4, color: getScoreColor(pctValue) }}>
                              ({pctValue}%)
                            </strong>
                          )}
                        </span>
                      </div>

                      {/* 3. Taux R/O */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 11.5,
                          borderTop: '1px dashed var(--border, rgba(255,255,255,0.08))',
                          paddingTop: 4,
                          marginTop: 2
                        }}
                      >
                        <span style={{ color: 'var(--muted-foreground, #64748b)', fontWeight: 600 }}>
                          {t('pipeline.roRateLabel')} :
                        </span>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: 12,
                            color: getScoreColor(roValue)
                          }}
                        >
                          {roValue != null ? `${roValue}%` : '0%'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--muted-foreground, #64748b)'
                        }}
                      >
                        {isOrgView ? 'Aucun objectif fixé par ce Team Manager' : 'Non configuré'}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--muted-foreground, #94a3b8)',
                          marginTop: 2
                        }}
                      >
                        {isOrgView ? 'Les objectifs d\'équipe sont définis dans le panneau du Team Manager' : 'Définir dans le panneau ci-dessus'}
                      </div>
                    </>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── Barre d'actions compacte (Objectifs, Export performances & Archives) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          marginBottom: 12
        }}
      >
        {showTargets && <TargetsButton members={members} />}
        <ExportButton members={members} managers={managers} isOrgView={isOrgView} />
        {enableArchive && <ArchivesDrawer />}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16
        }}
      >
        {Object.entries(grouped).map(([status, groupItems]) => {
          return (
            <div key={status} style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge variant={statusVariant[status] ?? 'default'}>
                    {statusLabel[status]} ({groupItems.length})
                  </Badge>
                  {status === 'conclue' && !isOrgView && isEndOfMonthPeriod && groupItems.length > 0 && (
                    <button
                      type="button"
                      title={t('pipeline.transferToClients')}
                      onClick={() => handleOpenTransferModal(groupItems)}
                      disabled={transferMutation.isPending}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        fontSize: 10.5,
                        fontWeight: 700,
                        borderRadius: 6,
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#10b981',
                        cursor: transferMutation.isPending ? 'not-allowed' : 'pointer',
                        transition: 'all 150ms ease'
                      }}
                    >
                      <FolderArchive size={11} />
                      <span>{t('pipeline.transferToClients')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Conteneur vertical à défilement autonome */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  flexGrow: 1,
                  maxHeight: 'calc(100vh - 300px)',
                  minHeight: 450,
                  overflowY: 'auto',
                  paddingRight: 4
                }}
              >
                {groupItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--secondary, #1e2a3b)',
                    border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 200ms ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
                    e.currentTarget.style.background = 'var(--card, #131c2e)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border, rgba(255,255,255,0.1))'
                    e.currentTarget.style.background = 'var(--secondary, #1e2a3b)'
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
                          color: 'var(--foreground, #f1f5f9)',
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
                            color: 'var(--muted-foreground, #94a3b8)',
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
                                fontWeight: 700,
                                color: 'var(--pipeline-opportunity-color, #047857)',
                                background: 'var(--pipeline-fresh-bg, #ecfdf5)',
                                border:
                                  '1px solid var(--pipeline-fresh-border, rgba(5, 150, 105, 0.25))',
                                borderRadius: 4,
                                padding: '1px 6px',
                                fontSize: 10.5
                              }}
                            >
                              <Banknote size={11} />
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
                                  borderRadius: 4,
                                  padding: '1px 6px',
                                  fontSize: 10.5
                                }}
                              >
                                <Calendar size={10} />
                                {item.nextFollowUp}
                              </span>
                            )}
                          {(() => {
                            const aging = getPipelineAging(
                              item.createdAt || (item as any).enteredAt,
                              item.status,
                              (item as any).assignedAt,
                              (item as any).updatedAt,
                              lang
                            )
                            return (
                              <span
                                title={`${lang === 'en' ? 'Entered on' : 'Entré le'} ${aging.enteredDateFormatted} (${aging.relativeTimeFormatted})`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontWeight: 700,
                                  color: aging.color,
                                  background: aging.bgColor,
                                  border: `1px solid ${aging.borderColor}`,
                                  borderRadius: 4,
                                  padding: '1px 6px',
                                  fontSize: 10.5
                                }}
                              >
                                <Clock size={10} />
                                {aging.badgeText}
                              </span>
                            )
                          })()}
                          <DeadlineBadge
                            deadline={item.assignmentDeadline}
                            status={item.status}
                            firstActionAt={item.firstActionAt}
                          />
                          {/* Badge Migration J+3 : deals conclus en M-1 en attente d'archivage clients */}
                          {((item as any).pendingMigration === true || isPendingMigrationDeal(item)) && (
                            <span
                              title={
                                lang === 'en'
                                  ? 'This deal was closed last month and will be automatically archived to the clients database on the 3rd of this month at 23:59.'
                                  : 'Cette affaire a \u00e9t\u00e9 conclue le mois dernier et sera automatiquement archiv\u00e9e dans la base clients le 3 de ce mois \u00e0 23h59.'
                              }
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontWeight: 700,
                                color: '#d97706',
                                background: 'rgba(217, 119, 6, 0.10)',
                                border: '1px solid rgba(217, 119, 6, 0.30)',
                                borderRadius: 4,
                                padding: '1px 6px',
                                fontSize: 10.5
                              }}
                            >
                              <Clock size={10} />
                              {lang === 'en' ? 'Pending migration J+3' : 'Migration J+3'}
                            </span>
                          )}
                          {(() => {
                            const filtered = (item.previousAssignees || []).filter(
                              (pa) =>
                                !(managerUid && pa.userId === managerUid) &&
                                !(item.assignedByName && pa.memberName === item.assignedByName)
                            )
                            return filtered.length > 0 ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontWeight: 600,
                                  color: '#f87171',
                                  background: 'rgba(239,68,68,0.08)',
                                  border: '1px solid rgba(239,68,68,0.2)',
                                  borderRadius: 4,
                                  padding: '1px 6px',
                                  fontSize: 10.5
                                }}
                              >
                                <AlertTriangle size={10} />
                                {lang === 'en' ? 'Already visited' : 'Déjà visité'}
                              </span>
                            ) : null
                          })()}
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
                      {isOrgView ? (
                        (() => {
                          const isSeniorLead =
                            (item as any).managerOrgRole === 'senior_manager' ||
                            Boolean(managerUid && (item as any).managerUid === managerUid)
                          if (isSeniorLead) {
                            return null
                          }
                          return (
                            <div
                              style={{
                                fontSize: 11,
                                color: 'rgba(99,102,241,0.85)',
                                marginTop: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontWeight: 500
                              }}
                            >
                              <Users size={11} />
                              <span>TM : {(item as any).managerName || 'Team Manager'}</span>
                              {item.assignedTo && item.assignedTo !== (item as any).managerUid && (
                                <span style={{ opacity: 0.75 }}>
                                  → {resolveMemberLabel(item, members) ?? (lang === 'en' ? 'Sales Rep' : 'Commercial')}
                                </span>
                              )}
                            </div>
                          )
                        })()
                      ) : (
                        item.assignedTo && item.assignedTo !== managerUid && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'rgba(99,102,241,0.7)',
                              marginTop: 3,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <User size={10} />
                            {resolveMemberLabel(item, members) ?? t('sidebar.member')}
                          </div>
                        )
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {/* Bouton archivage (TM uniquement, leads non conclus) */}
                      {enableArchive && normalize(item.status) !== 'conclue' && (
                        <button
                          type="button"
                          title={selectedForArchive.has(item.id) ? 'Désélectionner' : 'Sélectionner pour archiver'}
                          onClick={(e) => { e.stopPropagation(); toggleArchiveSelect(item.id) }}
                          style={{
                            flexShrink: 0,
                            padding: '0 8px',
                            minHeight: 28,
                            borderRadius: 6,
                            border: selectedForArchive.has(item.id)
                              ? '1px solid #f59e0b'
                              : '1px solid var(--border, rgba(255,255,255,0.1))',
                            background: selectedForArchive.has(item.id)
                              ? 'rgba(251,191,36,0.15)'
                              : 'transparent',
                            color: selectedForArchive.has(item.id) ? '#fbbf24' : 'var(--muted-foreground, #94a3b8)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'all 120ms ease'
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="21 8 21 21 3 21 3 8" />
                            <rect x="1" y="3" width="22" height="5" />
                            <line x1="10" y1="12" x2="14" y2="12" />
                          </svg>
                        </button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        loading={deletingId === item.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setItemToDelete({ id: item.id, name: item.companyName })
                        }}
                        style={{ flexShrink: 0, padding: '0 8px', minHeight: 28 }}
                        title={lang === 'en' ? 'Delete' : 'Supprimer'}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {groupItems.length === 0 && (
                <div
                  style={{
                    padding: '20px 14px',
                    background: 'var(--secondary, #1e2a3b)',
                    border: '1px dashed var(--border, rgba(255,255,255,0.1))',
                    borderRadius: 10,
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'var(--muted-foreground, #94a3b8)'
                  }}
                >
                  {t('pipeline.noProspect')}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>

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

    <ConfirmDialog
      isOpen={isTransferModalOpen}
      title={t('pipeline.transferToClientsConfirmTitle')}
      description={t('pipeline.transferToClientsConfirmMsg', {
        count: transferringItems?.length ?? 0
      })}
      confirmText={lang === 'en' ? 'Confirm Transfer' : 'Confirmer le transfert'}
      cancelText={lang === 'en' ? 'Cancel' : 'Annuler'}
      variant="info"
      isLoading={transferMutation.isPending}
      onConfirm={handleConfirmTransfer}
      onCancel={() => {
        if (!transferMutation.isPending) {
          setIsTransferModalOpen(false)
          setTransferringItems(null)
        }
      }}
    />
    </>
  )
}
