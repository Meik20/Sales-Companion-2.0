import { ButtonHTMLAttributes, CSSProperties } from 'react'

type Variant = 'primary' | 'ghost' | 'danger' | 'outline' | 'secondary'
type Size = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground border border-primary/20 shadow-sm hover:bg-primary/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
  secondary:
    'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 hover:border-primary/30 hover:scale-[1.01] active:scale-[0.98]',
  ghost:
    'bg-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground hover:scale-[1.01] active:scale-[0.98]',
  outline:
    'bg-card text-foreground border border-border hover:bg-secondary/80 hover:border-primary/40 shadow-xs hover:scale-[1.01] active:scale-[0.98]',
  danger:
    'bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 hover:scale-[1.02] active:scale-[0.98]'
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5'
}

export function Button({
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  style,
  children,
  ...props
}: Props) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-medium font-sans cursor-pointer transition-all duration-200 select-none ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${isDisabled ? 'opacity-50 !cursor-not-allowed pointer-events-none' : ''} ${className}`}
      style={style}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
      ) : null}
      {children}
    </button>
  )
}

