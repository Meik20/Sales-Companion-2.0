'use client'

import { useState } from 'react'
import type { CrmClient, CrmClientStatus } from '../types'
import { CrmStatusBadge } from './CrmStatusBadge'
import { SupportContactModal } from './SupportContactModal'
import { EmptyState } from '@/components/feedback'
import { useTranslation } from '@/providers/I18nProvider'
import { Phone, PhoneCall, Mail, Clock } from 'lucide-react'

type Props = {
  clients: CrmClient[]
  onSelect: (client: CrmClient) => void
  onStatusChange: (clientId: string, newStatus: CrmClientStatus) => Promise<void>
}

export function CrmMobileCard({ clients, onSelect }: Props) {
  const { t } = useTranslation()
  const [contactModal, setContactModal] = useState<CrmClient | null>(null)

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
      <EmptyState
        illustration="/illustrations/empty-states/empty-crm-support.png"
        illustrationSize="md"
        title={t('crm.noResult')}
        description={t('crm.noResultDesc')}
        className="py-12"
      />
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {clients.map((client) => (
          <div
            key={client.id}
            onClick={() => onSelect(client)}
            className="cursor-pointer rounded-2xl border border-border/80 bg-card p-4 transition-all duration-200 hover:border-[#1B7A3E]/50 hover:shadow-md active:scale-[0.99]"
          >
            {/* Top row : Double badge bilatéral style Turing */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <CrmStatusBadge status={client.status as CrmClientStatus} compact />
              {client.companyCity && (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full bg-secondary text-secondary-foreground border border-border/60">
                  {client.companyCity}
                </span>
              )}
            </div>

            {/* Titre & Secteur */}
            <div className="mb-2.5">
              <p className="truncate text-[15px] font-heading font-semibold text-foreground">
                {client.companyName}
              </p>
              {client.companySector && (
                <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                  {client.companySector}
                </p>
              )}
            </div>

            {/* Phone */}
            {client.companyPhone && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-2.5">
                <Phone size={12} strokeWidth={2} className="shrink-0 text-[#1B7A3E] opacity-80" />
                <span className="truncate">{client.companyPhone}</span>
              </div>
            )}

            {/* Next action */}
            {client.nextAction && (
              <div className="mb-3 rounded-xl bg-secondary/50 border border-border/40 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                  {t('crm.table.colNextAction')}
                </p>
                <p className="text-[12px] text-foreground leading-snug">{client.nextAction}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
              {client.lastActivityAt ? (
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock size={12} className="shrink-0 opacity-70" />
                  <span>{formatRelative(client.lastActivityAt)}</span>
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground/50">
                  {t('crm.table.noActivity')}
                </span>
              )}
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {client.companyPhone && (
                  <a
                    href={`tel:${client.companyPhone.replace(/\s+/g, '')}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/25"
                    title="Appeler"
                  >
                    <PhoneCall size={14} strokeWidth={1.8} />
                  </a>
                )}
                <button
                  onClick={() => setContactModal(client)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-500/25"
                  title="Envoyer un email"
                >
                  <Mail size={14} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Support contact modal */}
      {contactModal && (
        <SupportContactModal client={contactModal} onClose={() => setContactModal(null)} />
      )}
    </>
  )
}
