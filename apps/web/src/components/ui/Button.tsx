import { ButtonHTMLAttributes, CSSProperties } from 'react'

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
    background: '#1B7A3E',
    color: '#fff',
    border: '1px solid #2ea05a',
    boxShadow: '0 0 20px rgba(27,122,62,0.2)',
  },
  ghost: {
    background: 'rgba(255,255,255,0.05)',
    color: '#F0F6FC',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  outline: {
    background: 'transparent',
    color: '#2ea05a',
    border: '1px solid rgba(46,160,90,0.4)',
  },
  danger: {
    background: 'rgba(239,68,68,0.12)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.3)',
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
