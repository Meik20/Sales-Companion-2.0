import { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-[14px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  )
}
