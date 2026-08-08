'use client'

import React from 'react'
import { Building2, Monitor, Leaf, Truck, Briefcase } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'

type Sector = 'btp' | 'tech' | 'agro' | 'transport' | 'default'

interface ShortcutCardProps {
  sector?: Sector
  title: string
  subtitle: string
  count?: number
  updatedAt?: string
  onClick?: () => void
}

const sectorConfig: Record<
  Sector,
  { icon: React.ReactNode; label: string; color: string; bgClass: string; textClass: string; borderLeftClass: string }
> = {
  btp: {
    icon: <Building2 size={16} strokeWidth={2.2} />,
    label: 'BTP & Construction',
    color: '#f97316',
    bgClass: 'bg-orange-500/10 dark:bg-orange-500/15',
    textClass: 'text-orange-600 dark:text-orange-400',
    borderLeftClass: 'border-l-orange-500'
  },
  tech: {
    icon: <Monitor size={16} strokeWidth={2.2} />,
    label: 'Technologies',
    color: '#3b82f6',
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/15',
    textClass: 'text-blue-600 dark:text-blue-400',
    borderLeftClass: 'border-l-blue-500'
  },
  agro: {
    icon: <Leaf size={16} strokeWidth={2.2} />,
    label: 'Agroalimentaire',
    color: '#22c55e',
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderLeftClass: 'border-l-emerald-500'
  },
  transport: {
    icon: <Truck size={16} strokeWidth={2.2} />,
    label: 'Transport & Logistique',
    color: '#a855f7',
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/15',
    textClass: 'text-purple-600 dark:text-purple-400',
    borderLeftClass: 'border-l-purple-500'
  },
  default: {
    icon: <Briefcase size={16} strokeWidth={2.2} />,
    label: 'Secteur',
    color: '#64748b',
    bgClass: 'bg-slate-500/10 dark:bg-slate-500/15',
    textClass: 'text-slate-600 dark:text-slate-400',
    borderLeftClass: 'border-l-slate-500'
  }
}

export function ShortcutCard({
  sector = 'default',
  title,
  subtitle,
  count,
  updatedAt,
  onClick
}: ShortcutCardProps) {
  const { t } = useTranslation()
  const cfg = sectorConfig[sector] ?? sectorConfig.default

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border border-l-[3px] ${cfg.borderLeftClass} bg-card p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/70 hover:shadow-md`}
    >
      {/* Icône colorée par secteur */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.bgClass} ${cfg.textClass}`}>
        {cfg.icon}
      </div>

      {/* Texte */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </span>
        <span className="truncate text-[11px] font-medium text-muted-foreground">
          {subtitle}
        </span>
        {(count != null || updatedAt) && (
          <div className="mt-1 flex gap-2 text-[10px] font-medium text-muted-foreground/80">
            {count != null && (
              <span>
                {count.toLocaleString()} {t('search.companies')}
              </span>
            )}
            {updatedAt && (
              <span>
                {t('search.updatedAt')} : {updatedAt}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Flèche indicatrice */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`shrink-0 opacity-40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 ${cfg.textClass}`}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}
