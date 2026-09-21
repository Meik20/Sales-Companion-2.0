'use client'

import { useState } from 'react'
import type { CrmClient, CrmClientStatus } from '../types'
import { CRM_STATUS_CONFIG } from '../types'
import { CrmStatusBadge } from './CrmStatusBadge'
import { useTranslation } from '@/providers/I18nProvider'

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
  const [statusPopup, setStatusPopup] = useState<string | null>(null)
  const [editingAction, setEditingAction] = useState<string | null>(null)
  const [actionDraft, setActionDraft] = useState('')
  const [savingAction, setSavingAction] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

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
      <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1.2fr_0.9fr_1.3fr_1.4fr_1.4fr] border-b border-border bg-secondary/30 px-4 py-3 gap-3">
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
          <div className="py-16 text-center">
            <p className="text-[32px]">🗂️</p>
            <p className="mt-2 text-[15px] font-semibold text-foreground">{t('crm.noResult')}</p>
            <p className="text-[13px] text-muted-foreground">{t('crm.noResultDesc')}</p>
          </div>
        ) : clients.map((client, i) => (
          <div
            key={client.id}
            className={`group grid grid-cols-[2fr_1.2fr_0.9fr_1.3fr_1.4fr_1.4fr] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/20 ${i < clients.length - 1 ? 'border-b border-border' : ''}`}
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
                  className="block truncate text-[12px] text-primary hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  📞 {client.companyPhone}
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
                onClick={() => setStatusPopup(statusPopup === client.id ? null : client.id)}
                className="cursor-pointer transition-opacity hover:opacity-80"
              >
                <CrmStatusBadge status={client.status as CrmClientStatus} />
              </button>

              {/* Status dropdown */}
              {statusPopup === client.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusPopup(null)} />
                  <div className="absolute left-0 top-full z-20 mt-1.5 min-w-[180px] rounded-xl border border-border bg-card p-2 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
                    {CRM_STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => void handleStatusChange(client.id, s)}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors hover:bg-secondary"
                        style={{ color: CRM_STATUS_CONFIG[s].color }}
                      >
                        {CRM_STATUS_CONFIG[s].emoji} {t(CRM_STATUS_CONFIG[s].labelKey)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Last activity */}
            <div>
              {client.lastActivityAt ? (
                <>
                  <p className="text-[12px] font-semibold text-foreground">{formatRelative(client.lastActivityAt)}</p>
                  {client.lastActivityTitle && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{client.lastActivityTitle}</p>
                  )}
                </>
              ) : (
                <span className="text-[12px] text-muted-foreground">—</span>
              )}
            </div>

            {/* Next action */}
            <div>
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
                    className="cursor-pointer rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {savingAction === client.id ? '…' : '✓'}
                  </button>
                  <button
                    onClick={() => { setEditingAction(null); setActionDraft('') }}
                    className="cursor-pointer rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setEditingAction(client.id); setActionDraft(client.nextAction || '') }}
                  className="group/next flex w-full cursor-pointer items-start gap-1 text-left"
                >
                  {client.nextAction ? (
                    <span className={`line-clamp-2 text-[12px] font-medium transition-colors group-hover/next:text-primary ${isOverdue(client.nextActionAt) ? 'text-red-500 dark:text-red-400' : 'text-foreground'}`}>
                      {isOverdue(client.nextActionAt) && '⚠️ '}
                      {client.nextAction}
                      {client.nextActionAt && (
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">({formatDate(client.nextActionAt)})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[12px] text-muted-foreground/60 italic group-hover/next:text-primary">
                      + {t('crm.table.addNextAction')}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <ActionBtn
                emoji="👁"
                label={t('crm.table.view')}
                color="var(--color-accent)"
                onClick={() => onSelect(client)}
              />
              <ActionBtn
                emoji="📞"
                label={t('crm.table.call')}
                color="#22c55e"
                onClick={() => {
                  const phone = client.companyPhone?.replace(/\s+/g, '')
                  if (phone) window.open(`tel:${phone}`, '_blank')
                }}
              />
              <ActionBtn
                emoji="💬"
                label="WhatsApp"
                color="#25d366"
                onClick={() => {
                  const phone = client.companyPhone?.replace(/\s+/g, '').replace('+', '')
                  if (phone) window.open(`https://wa.me/${phone}`, '_blank')
                }}
              />
              {confirmDelete === client.id ? (
                <>
                  <button
                    onClick={() => { onDelete(client.id); setConfirmDelete(null) }}
                    className="cursor-pointer rounded-lg border border-red-500/40 bg-red-500/15 px-2.5 py-1.5 text-[11px] font-bold text-red-500 transition-colors hover:bg-red-500/25"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="cursor-pointer rounded-lg border border-border bg-transparent px-2 py-1.5 text-[11px] text-muted-foreground"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <ActionBtn
                  emoji="🗑"
                  label={t('crm.table.delete')}
                  color="#ef4444"
                  onClick={() => setConfirmDelete(client.id)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            {t('crm.table.showing')} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} / {totalCount}
          </p>
          <div className="flex gap-1.5">
            <PaginationBtn label="←" disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
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
            <PaginationBtn label="→" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} />
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ emoji, label, color, onClick }: { emoji: string; label: string; color: string; onClick: () => void }) {
  return (
    <button
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-[14px] transition-all hover:scale-110 active:scale-95"
      style={{ background: `${color}18` }}
    >
      {emoji}
    </button>
  )
}

function PaginationBtn({ label, active, disabled, onClick }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
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
