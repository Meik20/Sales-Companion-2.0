'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { CrmClient, CrmClientStatus } from '../types'
import { CRM_STATUS_CONFIG } from '../types'
import { CrmStatusBadge } from './CrmStatusBadge'
import { SupportContactModal } from './SupportContactModal'
import { EmptyState } from '@/components/feedback'
import { useTranslation } from '@/providers/I18nProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  Phone,
  PhoneCall,
  Mail,
  Eye,
  Trash2,
  Plus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react'

type Props = {
  clients: CrmClient[]
  onSelect: (client: CrmClient) => void
  onStatusChange: (clientId: string, newStatus: CrmClientStatus) => Promise<void>
  onNextActionSave: (clientId: string, text: string) => Promise<void>
  onDelete: (clientId: string) => void
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (p: number) => void
}

const CRM_STATUSES = Object.keys(CRM_STATUS_CONFIG) as CrmClientStatus[]

export function CrmTable({
  clients, onSelect, onStatusChange, onNextActionSave, onDelete,
  page, pageSize, totalCount, onPageChange
}: Props) {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const isSupportAgent = user?.role === 'support_agent'

  const [statusPopup, setStatusPopup] = useState<{
    id: string
    top: number
    left: number
    openUp: boolean
  } | null>(null)
  const [editingAction, setEditingAction] = useState<string | null>(null)
  const [actionDraft, setActionDraft] = useState('')
  const [savingAction, setSavingAction] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [contactModal, setContactModal] = useState<CrmClient | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on scroll / resize — but NOT when scrolling inside the dropdown itself
  useEffect(() => {
    if (!statusPopup) return
    const close = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return
      setStatusPopup(null)
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [statusPopup])

  const totalPages = Math.ceil(totalCount / pageSize)

  function formatDate(iso?: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  function formatRelative(iso?: string) {
    if (!iso) return null
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return t('crm.table.today')
    if (days === 1) return t('crm.table.yesterday')
    if (days < 30) return `il y a ${days}j`
    return formatDate(iso)
  }

  function isOverdue(nextActionAt?: string) {
    if (!nextActionAt) return false
    return new Date(nextActionAt) < new Date()
  }

  async function handleStatusChange(clientId: string, status: CrmClientStatus) {
    setStatusPopup(null)
    await onStatusChange(clientId, status)
  }

  async function handleSaveAction(clientId: string) {
    setSavingAction(clientId)
    await onNextActionSave(clientId, actionDraft)
    setSavingAction(null)
    setEditingAction(null)
    setActionDraft('')
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1.2fr_0.9fr_1.3fr_1.4fr_1.4fr] border-b border-border bg-secondary/30 px-4 py-3 gap-3 rounded-t-xl">
          {[
            t('crm.table.colCompany'),
            t('crm.table.colContact'),
            t('crm.table.colStatus'),
            t('crm.table.colLastActivity'),
            t('crm.table.colNextAction'),
            t('crm.table.colActions')
          ].map(col => (
            <span key={col} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{col}</span>
          ))}
        </div>

        {/* Rows */}
        {clients.length === 0 ? (
          <EmptyState
            illustration="/illustrations/empty-states/empty-crm-support.png"
            illustrationSize="md"
            title={t('crm.noResult')}
            description={t('crm.noResultDesc')}
            className="py-12"
          />
        ) : clients.map((client, i) => {
          const isPipelineClient = client._source === 'pipeline'
          const canDelete = !(isSupportAgent && isPipelineClient)

          return (
          <div
            key={client.id}
            className={`group grid grid-cols-[2fr_1.2fr_0.9fr_1.3fr_1.4fr_1.4fr] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/20 ${i === clients.length - 1 ? 'rounded-b-xl' : 'border-b border-border'}`}
          >
            {/* Company */}
            <div
              className="cursor-pointer min-w-0"
              onClick={() => onSelect(client)}
            >
              <p className="truncate text-[13px] font-bold text-foreground group-hover:text-primary transition-colors">
                {client.companyName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                {[client.companyCity, client.companySector].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>

            {/* Contact */}
            <div className="min-w-0">
              {client.companyPhone ? (
                <a
                  href={`tel:${client.companyPhone}`}
                  className="inline-flex items-center gap-1.5 truncate text-[12px] text-primary hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  <Phone size={12} strokeWidth={2} className="shrink-0 opacity-70" />
                  <span className="truncate">{client.companyPhone}</span>
                </a>
              ) : (
                <span className="text-[12px] text-muted-foreground">—</span>
              )}
              {client.contactName && (
                <p className="truncate text-[11px] text-muted-foreground mt-0.5">{client.contactName}</p>
              )}
            </div>

            {/* Status */}
            <div className="relative">
              <button
                onClick={(e) => {
                  if (statusPopup?.id === client.id) {
                    setStatusPopup(null)
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const DROPDOWN_HEIGHT = 200
                    const spaceBelow = window.innerHeight - rect.bottom
                    const openUp = spaceBelow < DROPDOWN_HEIGHT + 16
                    setStatusPopup({
                      id: client.id,
                      top: openUp ? rect.top : rect.bottom + 6,
                      left: rect.left,
                      openUp,
                    })
                  }
                }}
                className="cursor-pointer transition-opacity hover:opacity-80"
              >
                <CrmStatusBadge status={client.status as CrmClientStatus} />
              </button>
            </div>

            {/* Last activity */}
            <div className="min-w-0">
              {client.lastActivityAt ? (
                <>
                  <p className="text-[12px] font-semibold text-foreground">{formatRelative(client.lastActivityAt)}</p>
                  {client.lastActivityTitle && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={client.lastActivityTitle}>{client.lastActivityTitle}</p>
                  )}
                </>
              ) : (
                <span className="text-[12px] text-muted-foreground">—</span>
              )}
            </div>

            {/* Next action */}
            <div className="min-w-0">
              {editingAction === client.id ? (
                <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={actionDraft}
                    onChange={e => setActionDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') void handleSaveAction(client.id)
                      if (e.key === 'Escape') { setEditingAction(null); setActionDraft('') }
                    }}
                    placeholder={t('crm.table.nextActionPlaceholder')}
                    className="flex-1 rounded-lg border border-primary bg-background px-2 py-1 text-[12px] text-foreground outline-none"
                  />
                  <button
                    disabled={savingAction === client.id}
                    onClick={() => void handleSaveAction(client.id)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    {savingAction === client.id ? '…' : <Check size={13} strokeWidth={2.5} />}
                  </button>
                  <button
                    onClick={() => { setEditingAction(null); setActionDraft('') }}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setEditingAction(client.id); setActionDraft(client.nextAction || '') }}
                  className="group/next flex w-full cursor-pointer items-start gap-1 text-left"
                >
                  {client.nextAction ? (
                    <span className={`line-clamp-2 text-[12px] font-medium transition-colors group-hover/next:text-primary ${isOverdue(client.nextActionAt) ? 'text-red-500 dark:text-red-400' : 'text-foreground'}`}>
                      {isOverdue(client.nextActionAt) && (
                        <AlertCircle size={12} strokeWidth={2.5} className="inline mr-1 text-red-500 shrink-0 align-middle" />
                      )}
                      {client.nextAction}
                      {client.nextActionAt && (
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">({formatDate(client.nextActionAt)})</span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground/60 italic group-hover/next:text-primary">
                      <Plus size={12} strokeWidth={2} />
                      {t('crm.table.addNextAction')}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <ActionBtn
                icon={<Eye size={14} strokeWidth={1.8} />}
                label={t('crm.table.view')}
                color="var(--color-accent)"
                onClick={() => onSelect(client)}
              />
              <ActionBtn
                icon={<PhoneCall size={14} strokeWidth={1.8} />}
                label={t('crm.table.call')}
                color="#22c55e"
                onClick={() => {
                  const phone = client.companyPhone?.replace(/\s+/g, '')
                  if (phone) window.open(`tel:${phone}`, '_blank')
                }}
              />
              <ActionBtn
                icon={<Mail size={14} strokeWidth={1.8} />}
                label="Envoyer un email"
                color="#6366f1"
                onClick={() => setContactModal(client)}
              />
              {canDelete && (
                confirmDelete === client.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { onDelete(client.id); setConfirmDelete(null) }}
                      title={t('common.confirm')}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-red-500/40 bg-red-500/15 text-red-500 transition-colors hover:bg-red-500/25"
                    >
                      <Check size={13} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      title={t('common.cancel')}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-transparent text-muted-foreground transition-colors hover:bg-secondary"
                    >
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <ActionBtn
                    icon={<Trash2 size={14} strokeWidth={1.8} />}
                    label={t('crm.table.delete')}
                    color="#ef4444"
                    onClick={() => setConfirmDelete(client.id)}
                  />
                )
              )}
            </div>
          </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            {t('crm.table.showing')} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} / {totalCount}
          </p>
          <div className="flex items-center gap-1.5">
            <PaginationBtn
              label={<ChevronLeft size={14} strokeWidth={2} />}
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            />
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1
              return (
                <PaginationBtn
                  key={p}
                  label={String(p)}
                  active={p === page}
                  onClick={() => onPageChange(p)}
                />
              )
            })}
            <PaginationBtn
              label={<ChevronRight size={14} strokeWidth={2} />}
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            />
          </div>
        </div>
      )}

      {/* Support contact modal */}
      {contactModal && (
        <SupportContactModal
          client={contactModal}
          onClose={() => setContactModal(null)}
        />
      )}

      {/* Status dropdown portal — renders outside any overflow:hidden containers */}
      {statusPopup && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setStatusPopup(null)} />
          {/* Dropdown */}
          <div
            ref={dropdownRef}
            className="fixed z-50 min-w-[185px] max-h-[200px] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-1.5 shadow-[0_12px_44px_rgba(0,0,0,0.55)] [scrollbar-width:thin]"
            style={
              statusPopup.openUp
                ? { bottom: `calc(100vh - ${statusPopup.top}px + 6px)`, left: statusPopup.left }
                : { top: statusPopup.top, left: statusPopup.left }
            }
          >
            {CRM_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => {
                  void handleStatusChange(
                    statusPopup.id,
                    s
                  )
                  setStatusPopup(null)
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors hover:bg-secondary"
                style={{ color: CRM_STATUS_CONFIG[s].color }}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CRM_STATUS_CONFIG[s].color }} />
                <span className="truncate">{t(CRM_STATUS_CONFIG[s].labelKey)}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

function ActionBtn({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-transparent transition-all hover:scale-105 active:scale-95"
      style={{ background: `${color}18`, color }}
    >
      {icon}
    </button>
  )
}

function PaginationBtn({ label, active, disabled, onClick }: { label: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 min-w-[32px] cursor-pointer items-center justify-center rounded-lg border px-2 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        borderColor: active ? 'var(--color-accent)' : 'var(--border)',
        background: active ? 'var(--color-accent)' : 'transparent',
        color: active ? 'white' : 'var(--muted-foreground)'
      }}
    >
      {label}
    </button>
  )
}
