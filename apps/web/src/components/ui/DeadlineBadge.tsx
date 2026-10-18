'use client'

import React from 'react'
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { getDeadlineInfo } from '@/lib/deadlineUtils'
import { useTranslation } from '@/providers/I18nProvider'

interface DeadlineBadgeProps {
  deadline?: string | null
  status?: string | null
  firstActionAt?: string | null
  size?: 'sm' | 'md'
  showIcon?: boolean
}

export function DeadlineBadge({
  deadline,
  status,
  firstActionAt,
  size = 'sm',
  showIcon = true
}: DeadlineBadgeProps) {
  const { lang } = useTranslation()
  const info = getDeadlineInfo(deadline, status, firstActionAt, lang)

  if (!info) return null

  const isSmall = size === 'sm'

  return (
    <span
      title={
        info.isCompleted
          ? 'Prospect pris en charge dans les délais'
          : `Échéance fixée : ${new Date(deadline as string).toLocaleString(
              lang === 'en' ? 'en-US' : 'fr-FR',
              { dateStyle: 'medium', timeStyle: 'short' }
            )}`
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 3 : 5,
        padding: isSmall ? '2px 6px' : '3px 8px',
        fontSize: isSmall ? 10.5 : 11.5,
        fontWeight: 700,
        borderRadius: 6,
        color: info.color,
        backgroundColor: info.bgColor,
        border: `1px solid ${info.borderColor}`,
        lineHeight: 1,
        whiteSpace: 'nowrap'
      }}
    >
      {showIcon && (
        info.isCompleted ? (
          <CheckCircle2 size={isSmall ? 11 : 13} style={{ color: info.color }} />
        ) : info.isOverdue ? (
          <AlertTriangle size={isSmall ? 11 : 13} style={{ color: info.color }} />
        ) : (
          <Clock size={isSmall ? 11 : 13} style={{ color: info.color }} />
        )
      )}
      <span>{info.badgeText}</span>
    </span>
  )
}
