// ─── LoadingState ─────────────────────────────────────────────────────────────

import React from 'react'
import Link from 'next/link'
import { useTranslation } from '@/providers/I18nProvider'
import { Button } from '@/components/ui/Button'

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

export type EmptyStateAction = {
  label: string
  onClick?: () => void
  href?: string
  icon?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
}

function isActionObject(action: unknown): action is EmptyStateAction {
  return typeof action === 'object' && action !== null && 'label' in action
}

type EmptyProps = {
  title: string
  description?: string
  icon?: string | React.ReactNode
  illustration?: string
  illustrationAlt?: string
  illustrationSize?: 'sm' | 'md' | 'lg'
  action?: EmptyStateAction | React.ReactNode
  secondaryAction?: EmptyStateAction | React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon = '📭',
  illustration,
  illustrationAlt,
  illustrationSize = 'md',
  action,
  secondaryAction,
  children,
  className = ''
}: EmptyProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2.5 px-6 py-8 text-center text-muted-foreground ${className}`}
    >
      {illustration ? (
        <div className="relative mx-auto flex items-center justify-center mb-2 select-none">
          {/* Lueur d'ambiance en arrière-plan adaptée aux thèmes clair et sombre */}
          <div className="absolute inset-0 m-auto h-32 w-32 rounded-full bg-blue-500/10 blur-2xl dark:bg-blue-400/15 pointer-events-none" />
          <img
            src={illustration}
            alt={illustrationAlt || title}
            className={`relative z-10 w-auto object-contain transition-transform duration-300 hover:scale-[1.02] ${
              illustrationSize === 'sm'
                ? 'max-h-[120px]'
                : illustrationSize === 'lg'
                ? 'max-h-[220px]'
                : 'max-h-[175px]'
            }`}
            loading="lazy"
          />
        </div>
      ) : typeof icon === 'string' ? (
        <span className="text-[36px] mb-1">{icon}</span>
      ) : (
        icon
      )}

      <p className="m-0 text-[16px] font-semibold tracking-tight text-foreground">{title}</p>
      {description ? (
        <p className="m-0 max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}

      {/* Actions (CTA) */}
      {action || secondaryAction ? (
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5">
          {React.isValidElement(action) ? (
            action
          ) : isActionObject(action) ? (
            action.href ? (
              <Link href={action.href}>
                <Button variant={action.variant || 'primary'} size="sm">
                  {action.icon}
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button variant={action.variant || 'primary'} size="sm" onClick={action.onClick}>
                {action.icon}
                {action.label}
              </Button>
            )
          ) : null}

          {React.isValidElement(secondaryAction) ? (
            secondaryAction
          ) : isActionObject(secondaryAction) ? (
            secondaryAction.href ? (
              <Link href={secondaryAction.href}>
                <Button variant={secondaryAction.variant || 'outline'} size="sm">
                  {secondaryAction.icon}
                  {secondaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant={secondaryAction.variant || 'outline'}
                size="sm"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.icon}
                {secondaryAction.label}
              </Button>
            )
          ) : null}
        </div>
      ) : null}

      {children}
    </div>
  )
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

type ErrorProps = {
  title?: string
  description?: string
  illustration?: string
  action?: EmptyStateAction | React.ReactNode
  onRetry?: () => void
  retryLabel?: string
  compact?: boolean
}

export function ErrorState({
  title,
  description,
  illustration,
  action,
  onRetry,
  retryLabel,
  compact = false
}: ErrorProps) {
  const { t } = useTranslation()
  const displayTitle = title ?? t('feedback.errorOccurred')

  if (!compact && illustration) {
    return (
      <EmptyState
        illustration={illustration}
        title={displayTitle}
        description={description}
        action={
          onRetry
            ? {
                label: retryLabel ?? t('common.retry' as any) ?? 'Réessayer',
                onClick: onRetry,
                variant: 'primary'
              }
            : action
        }
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/6 px-6 py-8 text-center">
      <span className="text-[28px]">⚠️</span>
      <p className="m-0 font-semibold text-red-400">{displayTitle}</p>
      {description ? <p className="m-0 text-[13px] text-muted-foreground">{description}</p> : null}
      {onRetry ? (
        <div className="mt-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel ?? t('common.retry' as any) ?? 'Réessayer'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

