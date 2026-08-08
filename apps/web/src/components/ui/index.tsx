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
    background: 'rgba(52, 168, 83, 0.12)',
    color: '#1B7A3E',
    border: '1px solid rgba(52, 168, 83, 0.25)'
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

export function Badge({ children, variant = 'default', className = '', style, dot = false, ping = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-all ${className}`}
      style={{
        ...badgeStyles[variant],
        ...style
      }}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {ping && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />}
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
        </span>
      )}
      {children}
    </span>
  )
}

/** Composant Pilule Badge style Landing Hero ("Intelligence B2B Cameroun") */
export function PillBadge({ children, ping = true, className = '' }: { children: ReactNode; ping?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-xs hover:border-primary/40 transition-all ${className}`}>
      <span className="relative flex h-2 w-2">
        {ping && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1B7A3E] opacity-75" />}
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1B7A3E]" />
      </span>
      {children}
    </span>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({ children, className = '', style }: PropsWithChildren<{ className?: string; style?: CSSProperties }>) {
  return (
    <div
      className={`bg-card border border-border/80 rounded-xl p-5 shadow-xs transition-all hover:shadow-md ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

/** Carte dépolie style Glassmorphism avec flou d'arrière-plan */
export function GlassCard({ children, className = '', style }: PropsWithChildren<{ className?: string; style?: CSSProperties }>) {
  return (
    <div
      className={`backdrop-blur-md bg-card/85 border border-border/60 rounded-xl p-5 shadow-sm hover:border-primary/30 transition-all ${className}`}
      style={style}
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
        background: 'var(--card, #131c2e)',
        border: `1px solid ${'var(--border, rgba(255,255,255,0.1))'}`,
        borderRadius: radius.lg,
        boxShadow: shadows.sm,
        padding: padded ? spacing.xl : 0,
        ...style
      }}
    >
      {children}
    </div>
  )
}

// ─── Stack ───────────────────────────────────────────────────────────────────

type StackProps = PropsWithChildren<{ gap?: number }>

export function Stack({ children, gap = 16 }: StackProps) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap }}>{children}</div>
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
            flexWrap: 'wrap'
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--foreground, #f1f5f9)',
                letterSpacing: '-.01em'
              }}
            >
              {title}
            </h2>
            {subtitle ? (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-foreground, #94a3b8)' }}>{subtitle}</p>
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
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--muted-foreground, #94a3b8)',
          letterSpacing: '.04em',
          textTransform: 'uppercase'
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          marginTop: 8,
          color: accent ? 'var(--color-primary)' : 'var(--foreground, #f1f5f9)',
          letterSpacing: '-.03em',
          fontFamily: 'inherit'
        }}
      >
        {value}
      </div>
      {hint ? (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted-foreground, #94a3b8)' }}>{hint}</div>
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
        gap: spacing.lg
      }}
    >
      {children}
    </div>
  )
}

// ─── PageGrid ────────────────────────────────────────────────────────────────

export function PageGrid({ children }: PropsWithChildren) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>{children}</div>
}
