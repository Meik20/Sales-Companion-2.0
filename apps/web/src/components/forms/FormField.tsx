import { ReactNode } from 'react'
import { colors } from '@/styles/tokens'

type Props = {
  label: string
  children: ReactNode
  error?: string
  hint?: string
  required?: boolean
}

export function FormField({ label, children, error, hint, required }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: colors.textMid,
          letterSpacing: '.04em',
          textTransform: 'uppercase'
        }}
      >
        {label}
        {required ? <span style={{ color: '#f87171', marginLeft: 3 }}>*</span> : null}
      </label>
      {children}
      {error ? <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span> : null}
      {hint && !error ? <span style={{ fontSize: 12, color: colors.textDim }}>{hint}</span> : null}
    </div>
  )
}
