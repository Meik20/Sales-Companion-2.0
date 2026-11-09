'use client'

import { ReactNode } from 'react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

type Props = {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <h1 className="m-0 text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {subtitle ? (
          <InfoTooltip content={subtitle} size={15} placement="bottom" />
        ) : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  )
}
