import { ReactNode } from 'react'
import { colors } from '@/styles/tokens'

type Props = {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: 28,
        flexWrap: 'wrap'
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            color: colors.text,
            fontFamily: 'inherit'
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p style={{ margin: '6px 0 0', fontSize: 14, color: colors.textMid }}>{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 8 }}>{actions}</div> : null}
    </div>
  )
}
