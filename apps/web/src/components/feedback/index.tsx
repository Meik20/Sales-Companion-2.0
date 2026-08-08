// ─── LoadingState ─────────────────────────────────────────────────────────────

import { useTranslation } from '@/providers/I18nProvider'

type LoadingProps = { title?: string; description?: string }

export function LoadingState({ title, description }: LoadingProps) {
  const { t } = useTranslation()
  const displayTitle = title ?? t('feedback.loading')
  const displayDesc = description ?? t('feedback.pleaseWait')
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-muted-foreground">
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      <span
        className="inline-block h-7 w-7 rounded-full border-[3px] border-white/10"
        style={{ borderTopColor: 'hsl(var(--primary))', animation: 'spin 0.8s linear infinite' }}
      />
      <div className="text-center">
        <p className="m-0 font-semibold text-foreground">{displayTitle}</p>
        {displayDesc ? <p className="m-0 mt-1 text-[13px]">{displayDesc}</p> : null}
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

type EmptyProps = { title: string; description?: string; icon?: string }

export function EmptyState({ title, description, icon = '📭' }: EmptyProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-10 text-center text-muted-foreground">
      <span className="text-[36px]">{icon}</span>
      <p className="m-0 text-[15px] font-semibold text-foreground">{title}</p>
      {description ? <p className="m-0 text-[13px]">{description}</p> : null}
    </div>
  )
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

type ErrorProps = { title?: string; description?: string }

export function ErrorState({ title, description }: ErrorProps) {
  const { t } = useTranslation()
  const displayTitle = title ?? t('feedback.errorOccurred')
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/6 px-6 py-8 text-center">
      <span className="text-[28px]">⚠️</span>
      <p className="m-0 font-semibold text-red-400">{displayTitle}</p>
      {description ? <p className="m-0 text-[13px] text-muted-foreground">{description}</p> : null}
    </div>
  )
}
