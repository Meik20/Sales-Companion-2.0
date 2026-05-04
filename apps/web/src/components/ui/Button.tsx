import { ButtonHTMLAttributes, CSSProperties } from 'react'
import { colors } from '@/styles/tokens'

type Variant = 'primary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const base: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: 'none',
  borderRadius: 10,
  fontFamily: 'inherit',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 300ms ease',
  whiteSpace: 'nowrap',
  letterSpacing: '.01em',
}

const variants: Record<Variant, CSSProperties> = {
  primary: {
    background: colors.green,
    color: '#fff',
    border: `1px solid var(--color-accent)`,
    boxShadow: `0 4px 16px rgba(133, 183, 235, 0.35)`,
  },
  ghost: {
    background: 'transparent',
    color: colors.textMid,
    border: '1px solid transparent',
  },
  outline: {
    background: 'transparent',
    color: colors.green,
    border: `1px solid var(--color-accent)`,
  },
  danger: {
    background: colors.dangerBg,
    color: colors.danger,
    border: `1px solid ${colors.dangerBorder}`,
  },
}

const sizes: Record<Size, CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 12 },
  md: { padding: '9px 18px', fontSize: 13 },
  lg: { padding: '12px 24px', fontSize: 14 },
}

export function Button({
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled,
  style,
  children,
  ...props
}: Props) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      style={{
        ...base,
        ...variants[variant],
        ...sizes[size],
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: 14,
            height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      ) : null}
      {children}
    </button>
  )
}
