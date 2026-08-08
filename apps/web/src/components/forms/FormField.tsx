import { ReactNode } from 'react'

type Props = {
  label: string
  children: ReactNode
  error?: string
  hint?: string
  required?: boolean
}

export function FormField({ label, children, error, hint, required }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
        {label}
        {required ? <span className="ml-[3px] text-red-400">*</span> : null}
      </label>
      {children}
      {error ? <span className="text-[12px] text-red-400">{error}</span> : null}
      {hint && !error ? <span className="text-[12px] text-muted-foreground/70">{hint}</span> : null}
    </div>
  )
}
