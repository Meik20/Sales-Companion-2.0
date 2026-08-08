import { PropsWithChildren, ReactNode } from 'react'

type Props = PropsWithChildren<{
  title: string
  subtitle?: string
  actions?: ReactNode
}>

export function SectionCard({ title, subtitle, actions, children }: Props) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
      <div className={`flex flex-wrap items-start justify-between gap-3 ${children ? 'mb-4' : ''}`}>
        <div>
          <h3 className="m-0 text-[14px] font-bold text-foreground">{title}</h3>
          {subtitle ? <p className="mt-[3px] m-0 text-[12px] text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
