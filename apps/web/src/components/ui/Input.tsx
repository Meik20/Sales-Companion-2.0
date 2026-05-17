import { InputHTMLAttributes, forwardRef } from 'react'
import { colors } from '@/styles/tokens'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { error, style, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={error || props['aria-invalid']}
      style={{
        width: '100%',
        background: colors.bg2,
        border: `1px solid ${error ? colors.danger : colors.border2}`,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 13,
        color: colors.text,
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
        ...style
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'var(--color-accent)'
        e.target.style.boxShadow = `0 0 0 3px rgba(133, 183, 235, 0.2)`
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.target.style.borderColor = error ? colors.danger : colors.border2
        e.target.style.boxShadow = 'none'
        props.onBlur?.(e)
      }}
      {...props}
    />
  )
})
