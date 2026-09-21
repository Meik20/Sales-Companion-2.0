'use client'

import React from 'react'
import { useTranslation } from '@/providers/I18nProvider'
import { CRM_STATUS_CONFIG, CrmClientStatus } from '../types'

type Props = {
  status: CrmClientStatus | string
  size?: 'sm' | 'md'
  compact?: boolean
  className?: string
}

export function CrmStatusBadge({ status, size = 'sm', compact = false, className = '' }: Props) {
  const { t } = useTranslation()

  // Normalisation du statut si ancien ou valeur personnalisée
  const normalizedKey: CrmClientStatus =
    status in CRM_STATUS_CONFIG
      ? (status as CrmClientStatus)
      : status === 'conclue' || status === 'conclusion'
        ? 'won'
        : status === 'a_contacter'
          ? 'to_contact'
          : status === 'en_discussion'
            ? 'in_discussion'
            : status === 'proposition_envoyee'
              ? 'proposal_sent'
              : 'imported'

  const cfg = CRM_STATUS_CONFIG[normalizedKey] ?? CRM_STATUS_CONFIG.imported
  const label = t(cfg.labelKey) || status

  const isSmall = size === 'sm'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full select-none whitespace-nowrap transition-colors ${className}`}
      title={compact ? label : undefined}
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        padding: compact ? '2px 7px' : isSmall ? '2px 8px' : '4px 12px',
        fontSize: isSmall ? '11px' : '12.5px',
        lineHeight: 1.4
      }}
    >
      <span className="text-[10px] leading-none">{cfg.emoji}</span>
      {!compact && <span>{label}</span>}
    </span>
  )
}
