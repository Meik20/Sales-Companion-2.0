// ─── Badge ───────────────────────────────────────────────────────────────────

import { CSSProperties, PropsWithChildren, ReactNode } from 'react'
import { colors, radius, shadows, spacing } from '@/styles/tokens'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'

type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
}

const badgeStyles: Record<BadgeVariant, CSSProperties> = {
  default: {
    background: 'rgba(255,255,255,0.07)',
    color: colors.textMid,
    border: `1px solid ${colors.border}`,
  },
  success: {
    background: colors.successBg,
    color: 'var(--color-success)',
    border: `1px solid ${colors.successBorder}`,
  },
  warning: {
    background: colors.warningBg,
    color: 'var(--color-warning)',
    border: `1px solid ${colors.warningBorder}`,
  },
  danger: {
    background: colors.dangerBg,
    color: 'var(--color-danger)',
    border: `1px solid ${colors.dangerBorder}`,
  },
  info: {
    background: 'rgba(29,78,216,0.12)',
    color: 'var(--color-accent)',
    border: '1px solid rgba(29,78,216,0.3)',
  },
  gold: {
    background: colors.goldLight,
    color: colors.gold,
    border: `1px solid rgba(245,166,35,0.3)`,
  },
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: radius.pill,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.03em',
        ...badgeStyles[variant],
      }}
    >
      {children}
    </span>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({ children }: PropsWithChildren) {
  return (
    <div
      style={{
        background: colors.bg2,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.xl,
        boxShadow: shadows.sm,
      }}
    >
      {children}
    </div>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

type PanelProps = PropsWithChildren<{ padded?: boolean; style?: CSSProperties }>

export function Panel({ children, padded = true, style }: PanelProps) {
  return (
    <div
      style={{
        background: colors.bg2,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        boxShadow: shadows.sm,
        padding: padded ? spacing.xl : 0,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Stack ───────────────────────────────────────────────────────────────────

type StackProps = PropsWithChildren<{ gap?: number }>

export function Stack({ children, gap = 16 }: StackProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>{children}</div>
  )
}

// ─── DataCard ────────────────────────────────────────────────────────────────

type DataCardProps = PropsWithChildren<{
  title: string
  subtitle?: string
  actions?: ReactNode
  style?: CSSProperties
}>

export function DataCard({ title, subtitle, actions, children, style }: DataCardProps) {
  return (
    <Panel style={style}>
      <Stack gap={16}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: colors.text,
                letterSpacing: '-.01em',
              }}
            >
              {title}
            </h2>
            {subtitle ? (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: colors.textMid }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </div>
        {children}
      </Stack>
    </Panel>
  )
}

// ─── MetricCard ──────────────────────────────────────────────────────────────

type MetricCardProps = {
  label: string
  value: string | number
  hint?: string
  accent?: boolean
}

export function MetricCard({ label, value, hint, accent }: MetricCardProps) {
  return (
    <Panel>
      <div style={{ fontSize: 12, fontWeight: 500, color: colors.textMid, letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          marginTop: 8,
          color: accent ? 'var(--color-primary)' : colors.text,
          letterSpacing: '-.03em',
          fontFamily: 'inherit',
        }}
      >
        {value}
      </div>
      {hint ? (
        <div style={{ marginTop: 6, fontSize: 12, color: colors.textMid }}>{hint}</div>
      ) : null}
    </Panel>
  )
}

// ─── StatsGrid ───────────────────────────────────────────────────────────────

export function StatsGrid({ children }: PropsWithChildren) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: spacing.lg,
      }}
    >
      {children}
    </div>
  )
}

// ─── PageGrid ────────────────────────────────────────────────────────────────

export function PageGrid({ children }: PropsWithChildren) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
      {children}
    </div>
  )
}
