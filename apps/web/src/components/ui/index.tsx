// ─── Badge ───────────────────────────────────────────────────────────────────

import { CSSProperties, PropsWithChildren, ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'

type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
  style?: CSSProperties
  dot?: boolean
  ping?: boolean
}

const badgeStyles: Record<BadgeVariant, CSSProperties> = {
  default: {
    background: 'var(--secondary)',
    color: 'var(--muted-foreground)',
    border: '1px solid var(--border)'
  },
  success: {
    background: 'var(--pipeline-concluded-bg, rgba(52, 168, 83, 0.12))',
    color: 'var(--pipeline-concluded-color, #047857)',
    border: '1px solid var(--pipeline-concluded-border, rgba(52, 168, 83, 0.25))'
  },
  warning: {
    background: 'rgba(251, 188, 4, 0.15)',
    color: 'var(--google-yellow-700, #d97706)',
    border: '1px solid rgba(251, 188, 4, 0.3)'
  },
  danger: {
    background: 'rgba(234, 67, 53, 0.12)',
    color: 'var(--google-red-600, #dc2626)',
    border: '1px solid rgba(234, 67, 53, 0.25)'
  },
  info: {
    background: 'rgba(66, 133, 244, 0.12)',
    color: 'var(--primary)',
    border: '1px solid rgba(66, 133, 244, 0.25)'
  },
  gold: {
    background: 'rgba(245, 166, 35, 0.15)',
    color: '#d97706',
    border: '1px solid rgba(245, 166, 35, 0.3)'
  }
}

export function Badge({
  children,
  variant = 'default',
  className = '',
  style,
  dot = false,
  ping = false
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-all shadow-elevation-0 ${className}`}
      style={{
        ...badgeStyles[variant],
        ...style
      }}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {ping && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
          )}
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
        </span>
      )}
      {children}
    </span>
  )
}

/** Composant Pilule Badge style Landing Hero ("Intelligence B2B Cameroun") */
export function PillBadge({
  children,
  ping = true,
  className = ''
}: {
  children: ReactNode
  ping?: boolean
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/85 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-elevation-1 hover:border-primary/40 hover:shadow-elevation-2 transition-all duration-200 ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {ping && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
      </span>
      {children}
    </span>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className = '',
  style
}: PropsWithChildren<{ className?: string; style?: CSSProperties }>) {
  return (
    <div
      className={`bg-card border border-border/80 rounded-xl p-5 shadow-elevation-1 transition-all duration-200 ease-smooth hover:shadow-elevation-2 hover:-translate-y-0.5 ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

/** Carte dépolie style Glassmorphism avec flou d'arrière-plan */
export function GlassCard({
  children,
  className = '',
  style
}: PropsWithChildren<{ className?: string; style?: CSSProperties }>) {
  return (
    <div
      className={`backdrop-blur-md bg-card/85 border border-border/60 rounded-xl p-5 shadow-elevation-1 hover:border-primary/30 hover:shadow-elevation-2 hover:-translate-y-0.5 transition-all duration-200 ease-smooth ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

type PanelProps = PropsWithChildren<{ padded?: boolean; style?: CSSProperties; className?: string }>

export function Panel({ children, padded = true, style, className = '' }: PanelProps) {
  return (
    <div
      className={`transition-all duration-150 ease-smooth ${className}`}
      style={{
        background: 'var(--card, #ffffff)',
        border: '1px solid var(--border, #e6e8ec)',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
        padding: padded ? 16 : 0,
        ...style
      }}
    >
      {children}
    </div>
  )
}

// ─── Stack ───────────────────────────────────────────────────────────────────

type StackProps = PropsWithChildren<{ gap?: number }>

export function Stack({ children, gap = 12 }: StackProps) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap }}>{children}</div>
}

// ─── DataCard ────────────────────────────────────────────────────────────────

type DataCardProps = PropsWithChildren<{
  title: ReactNode
  subtitle?: string
  actions?: ReactNode
  style?: CSSProperties
}>

export function DataCard({ title, subtitle, actions, children, style }: DataCardProps) {
  return (
    <Panel style={style}>
      <Stack gap={14}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap'
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--foreground, #101828)',
                letterSpacing: '-.01em'
              }}
            >
              {title}
            </h2>
            {subtitle ? (
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: 12,
                  color: 'var(--muted-foreground, #475467)'
                }}
              >
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
  value: React.ReactNode
  hint?: string
  accent?: boolean
  hintColor?: string
  valueColor?: string
  children?: React.ReactNode
  className?: string
}

export function MetricCard({
  label,
  value,
  hint,
  accent,
  hintColor,
  valueColor,
  children,
  className = ''
}: MetricCardProps) {
  return (
    <Panel className={`hover:shadow-elevation-2 hover:-translate-y-0.5 ${className}`}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--muted-foreground, #94a3b8)',
          letterSpacing: '.05em',
          textTransform: 'uppercase'
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          marginTop: 8,
          color: valueColor ?? (accent ? 'var(--color-primary)' : 'var(--foreground, #f1f5f9)'),
          letterSpacing: '-.03em',
          fontFamily: 'var(--font-heading, inherit)'
        }}
      >
        {value}
      </div>
      {hint ? (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: hintColor ?? 'var(--muted-foreground, #94a3b8)'
          }}
        >
          {hint}
        </div>
      ) : null}
      {children}
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
        gap: 16
      }}
    >
      {children}
    </div>
  )
}

// ─── PageGrid ────────────────────────────────────────────────────────────────

export function PageGrid({ children }: PropsWithChildren) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>{children}</div>
}

export { ConfirmDialog } from './ConfirmDialog'
export type { ConfirmDialogProps, ConfirmDialogVariant } from './ConfirmDialog'
export { DeadlineBadge } from './DeadlineBadge'
export { ScOpportunityCard } from './ScOpportunityCard'
export type { ScOpportunityCardProps } from './ScOpportunityCard'
