'use client'

import type { CrmClient, CrmClientStatus } from '../types'
import { CrmStatusBadge } from './CrmStatusBadge'
import { useTranslation } from '@/providers/I18nProvider'

type Props = {
  clients: CrmClient[]
  onSelect: (client: CrmClient) => void
  onStatusChange: (clientId: string, newStatus: CrmClientStatus) => Promise<void>
}

export function CrmMobileCard({ clients, onSelect }: Props) {
  const { t } = useTranslation()

  function formatRelative(iso?: string) {
    if (!iso) return null
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return t('crm.table.today')
    if (days === 1) return t('crm.table.yesterday')
    if (days < 30) return `il y a ${days}j`
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })
  }

  if (clients.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[32px]">🗂️</p>
        <p className="mt-2 text-[15px] font-semibold text-foreground">{t('crm.noResult')}</p>
        <p className="text-[13px] text-muted-foreground">{t('crm.noResultDesc')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {clients.map(client => (
        <div
          key={client.id}
          onClick={() => onSelect(client)}
          className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
        >
          {/* Top row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold text-foreground">{client.companyName}</p>
              <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                {[client.companyCity, client.companySector].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <CrmStatusBadge status={client.status as CrmClientStatus} compact />
          </div>

          {/* Phone */}
          {client.companyPhone && (
            <p className="text-[12px] text-muted-foreground mb-2">
              📞 {client.companyPhone}
            </p>
          )}

          {/* Next action */}
          {client.nextAction && (
            <div className="mb-2 rounded-lg bg-secondary/50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                {t('crm.table.colNextAction')}
              </p>
              <p className="text-[12px] text-foreground">{client.nextAction}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            {client.lastActivityAt ? (
              <span className="text-[11px] text-muted-foreground">
                🕐 {formatRelative(client.lastActivityAt)}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground/50">{t('crm.table.noActivity')}</span>
            )}
            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              {client.companyPhone && (
                <>
                  <a
                    href={`tel:${client.companyPhone.replace(/\s+/g, '')}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-[14px] transition-colors hover:bg-blue-500/25"
                  >
                    📞
                  </a>
                  <a
                    href={`https://wa.me/${client.companyPhone.replace(/\s+/g, '').replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15 text-[14px] transition-colors hover:bg-green-500/25"
                  >
                    💬
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
