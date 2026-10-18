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
    'bg-primary text-primary-foreground border border-primary/30 shadow-elevation-1 hover:bg-primary/95 hover:shadow-elevation-2 hover:-translate-y-0.5 active:translate-y-0 active:shadow-elevation-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/50',
  secondary:
    'bg-secondary text-secondary-foreground border border-border/80 shadow-elevation-1 hover:bg-secondary/90 hover:border-border hover:shadow-elevation-2 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-border',
  ghost:
    'bg-transparent text-muted-foreground hover:bg-secondary/70 hover:text-foreground hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  outline:
    'bg-card/90 backdrop-blur-sm text-foreground border border-border/80 shadow-elevation-1 hover:bg-secondary/70 hover:border-primary/40 hover:shadow-elevation-2 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40',
  danger:
    'bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 hover:shadow-elevation-1 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-destructive/40'
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5 font-medium',
  md: 'px-4 py-2 text-sm rounded-lg gap-2 font-medium',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5 font-semibold'
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
      className={`inline-flex items-center justify-center font-sans cursor-pointer transition-all duration-150 ease-standard select-none outline-none ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${isDisabled ? 'opacity-50 !cursor-not-allowed pointer-events-none' : ''} ${className}`}
      style={style}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block shrink-0" />
      ) : null}
      {children}
    </button>
  )
}
