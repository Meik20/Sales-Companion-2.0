// ─── LoadingState ─────────────────────────────────────────────────────────────

import { colors } from '@/styles/tokens'

type LoadingProps = { title?: string; description?: string }

export function LoadingState({
  title = 'Chargement…',
  description = 'Veuillez patienter.',
}: LoadingProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: 40,
        color: colors.textMid,
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
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 600, color: colors.text }}>{title}</p>
        {description ? (
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>{description}</p>
        ) : null}
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
        textAlign: 'center',
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

export function ErrorState({
  title = 'Une erreur est survenue',
  description,
}: ErrorProps) {
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
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: 28 }}>⚠️</span>
      <p style={{ margin: 0, fontWeight: 600, color: '#f87171' }}>{title}</p>
      {description ? (
        <p style={{ margin: 0, fontSize: 13, color: colors.textMid }}>{description}</p>
      ) : null}
    </div>
  )
}
