import { PropsWithChildren, ReactNode } from 'react'
import { colors } from '@/styles/tokens'

type Props = PropsWithChildren<{
  title: string
  subtitle?: string
  actions?: ReactNode
}>

export function SectionCard({ title, subtitle, actions, children }: Props) {
  return (
    <div
      style={{
        background: colors.bg2,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 20,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: children ? 16 : 0,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>
            {title}
          </h3>
          {subtitle ? (
            <p style={{ margin: '3px 0 0', fontSize: 12, color: colors.textMid }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
