import { PropsWithChildren, ReactNode } from 'react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

type Props = PropsWithChildren<{
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}>

export function SectionCard({ title, subtitle, actions, children }: Props) {
  const isCount =
    typeof subtitle === 'string' &&
    (/^\d/.test(subtitle.trim()) || (subtitle.length <= 25 && !subtitle.includes('.')))

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
      <div className={`flex flex-wrap items-center justify-between gap-3 ${children ? 'mb-4' : ''}`}>
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-[14px] font-bold text-foreground">{title}</h3>
          {subtitle ? (
            isCount ? (
              <span className="text-[11px] font-medium text-muted-foreground bg-secondary/80 border border-border px-2 py-0.5 rounded-full">
                {subtitle}
              </span>
            ) : (
              <InfoTooltip content={subtitle} size={13} placement="right" />
            )
          ) : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
