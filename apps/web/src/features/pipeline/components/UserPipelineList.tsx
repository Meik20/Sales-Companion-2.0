'use client'

import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { colors } from '@/styles/tokens'

type PipelineItem = {
  id: string
  companyName: string
  status: string
  companyCity?: string
  companySector?: string
  note?: string
  nextAction?: string
  nextDate?: string | null
}

type Props = {
  items: PipelineItem[]
  onStatusChange?: (id: string, status: 'prospection' | 'negociation' | 'conclue') => void
}

const statusVariant: Record<string, 'info' | 'warning' | 'success'> = {
  prospection: 'info',
  negociation: 'warning',
  conclue:     'success',
}

const statusLabel: Record<string, string> = {
  prospection: 'Prospection',
  negociation: 'Négociation',
  conclue:     'Conclue',
}

export function UserPipelineList({ items, onStatusChange }: Props) {
  if (!items.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            padding: '16px 18px',
            background: colors.bg3,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          {/* Contenu */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14, color: colors.text }}>
                {item.companyName}
              </strong>
              <Badge variant={statusVariant[item.status] ?? 'default'}>
                {statusLabel[item.status] ?? item.status}
              </Badge>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px', fontSize: 12, color: colors.textMid }}>
              {item.companySector ? <span>🏭 {item.companySector}</span> : null}
              {item.companyCity   ? <span>📍 {item.companyCity}</span>   : null}
              {item.note          ? <span>📝 {item.note}</span>          : null}
              {item.nextAction    ? <span>⏭️ {item.nextAction}</span>    : null}
              {item.nextDate      ? <span>📅 {item.nextDate}</span>      : null}
            </div>
          </div>

          {/* Actions statut */}
          {onStatusChange ? (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
              {item.status !== 'prospection' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onStatusChange(item.id, 'prospection')}
                >
                  Prospection
                </Button>
              ) : null}
              {item.status !== 'negociation' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onStatusChange(item.id, 'negociation')}
                >
                  Négociation
                </Button>
              ) : null}
              {item.status !== 'conclue' ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onStatusChange(item.id, 'conclue')}
                >
                  ✓ Conclure
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
