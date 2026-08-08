import { InputHTMLAttributes, forwardRef } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { error, className = '', style, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={error || props['aria-invalid']}
      className={`w-full bg-card border ${
        error ? 'border-destructive focus:ring-destructive/30' : 'border-border focus:border-primary focus:ring-primary/20'
      } rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:ring-2 ${className}`}
      style={style}
      {...props}
    />
  )
})

