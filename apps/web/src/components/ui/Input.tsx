import { InputHTMLAttributes, forwardRef } from 'react'

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
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 13,
        color: '#F0F6FC',
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
        ...style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'rgba(46,160,90,0.6)'
        e.target.style.boxShadow = '0 0 0 3px rgba(27,122,62,0.15)'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'
        e.target.style.boxShadow = 'none'
        props.onBlur?.(e)
      }}
      {...props}
    />
  )
})
