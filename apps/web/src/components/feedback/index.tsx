// ─── LoadingState ─────────────────────────────────────────────────────────────

import { colors } from '@/styles/tokens'
import { useTranslation } from '@/providers/I18nProvider'

type LoadingProps = { title?: string; description?: string }

export function LoadingState({ title, description }: LoadingProps) {
  const { t } = useTranslation()
  const displayTitle = title ?? t('feedback.loading')
  const displayDesc = description ?? t('feedback.pleaseWait')
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: 40,
        color: colors.textMid
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: colors.greenMid,
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 600, color: colors.text }}>{displayTitle}</p>
        {displayDesc ? <p style={{ margin: '4px 0 0', fontSize: 13 }}>{displayDesc}</p> : null}
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

type EmptyProps = {
  title: string
  description?: string
  icon?: string
}

export function EmptyState({ title, description, icon = '📭' }: EmptyProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '40px 24px',
        color: colors.textMid,
        textAlign: 'center'
      }}
    >
      <span style={{ fontSize: 36 }}>{icon}</span>
      <p style={{ margin: 0, fontWeight: 600, color: colors.text, fontSize: 15 }}>{title}</p>
      {description ? <p style={{ margin: 0, fontSize: 13 }}>{description}</p> : null}
    </div>
  )
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

type ErrorProps = {
  title?: string
  description?: string
}

export function ErrorState({ title, description }: ErrorProps) {
  const { t } = useTranslation()
  const displayTitle = title ?? t('feedback.errorOccurred')
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '32px 24px',
        background: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 12,
        textAlign: 'center'
      }}
    >
      <span style={{ fontSize: 28 }}>⚠️</span>
      <p style={{ margin: 0, fontWeight: 600, color: '#f87171' }}>{displayTitle}</p>
      {description ? (
        <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>{description}</p>
      ) : null}
    </div>
  )
}
