'use client'

import React from 'react'
import { Star, Clock, User, ArrowUpRight, Building2 } from 'lucide-react'

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export interface ScOpportunityCardProps {
  title: string
  company: string
  amountFormatted?: string
  statusLabel?: string
  statusColor?: string
  assignedMemberName?: string
  lastActivityOrDueDate?: string
  summary?: string
  isPriority?: boolean
  priorityLabel?: string
  onClick?: () => void
  className?: string
}

/**
 * ScOpportunityCard
 * Composant de carte / fiche standardisé pour Sales Companion 2.0.
 * Inspiré du design épuré, aéré et bilatéral (Turing style) :
 * - Double badge en en-tête (Priorité/Statut à gauche, Montant/Valeur à droite)
 * - Typographie soignée avec font-heading
 * - Footer structuré avec résolution humaine des noms
 * - 100% vectoriel (Lucide React) et compatible Dark/Light mode
 */
export const ScOpportunityCard: React.FC<ScOpportunityCardProps> = ({
  title,
  company,
  amountFormatted,
  statusLabel,
  statusColor,
  assignedMemberName,
  lastActivityOrDueDate,
  summary,
  isPriority = false,
  priorityLabel = 'Prioritaire',
  onClick,
  className
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'group relative flex flex-col justify-between p-5 text-left',
        'rounded-2xl border border-border/70 bg-card text-card-foreground',
        'transition-all duration-200 hover:shadow-md hover:border-[#1B7A3E]/50 dark:hover:border-emerald-500/50',
        onClick && 'cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7A3E]',
        className
      )}
    >
      {/* ── Top Header : Double Badge Bilatéral ── */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {isPriority ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
              <Star size={12} className="fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400" />
              <span>{priorityLabel}</span>
            </span>
          ) : statusLabel ? (
            <span
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-secondary/80 text-foreground border border-border/60"
              style={statusColor ? { borderColor: `${statusColor}40`, color: statusColor } : undefined}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>

        {/* Badge Montant / Valeur Clé */}
        {amountFormatted && (
          <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full bg-[#1B7A3E] text-white shadow-xs shrink-0">
            {amountFormatted}
          </span>
        )}
      </div>

      {/* ── Titre & Entreprise ── */}
      <div className="space-y-1 mb-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-heading font-semibold text-base text-foreground group-hover:text-[#1B7A3E] dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
            {company}
          </h4>
          {onClick && (
            <ArrowUpRight
              size={16}
              className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
            />
          )}
        </div>
        <p className="text-xs font-medium text-muted-foreground line-clamp-1 flex items-center gap-1.5">
          <Building2 size={13} className="shrink-0 opacity-70" />
          <span>{title}</span>
        </p>
      </div>

      {/* ── Extrait descriptif ── */}
      {summary && (
        <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed mb-4">
          {summary}
        </p>
      )}

      {/* ── Footer Métier : Assignation & Relance ── */}
      {(assignedMemberName || lastActivityOrDueDate) && (
        <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground gap-2">
          {assignedMemberName ? (
            <div className="flex items-center gap-1.5 truncate max-w-[60%]">
              <User size={13} className="shrink-0 text-[#1B7A3E] dark:text-emerald-400" />
              <span className="truncate font-medium text-foreground">{assignedMemberName}</span>
            </div>
          ) : <div />}

          {lastActivityOrDueDate && (
            <div className="flex items-center gap-1 text-[11px] shrink-0">
              <Clock size={12} className="opacity-70" />
              <span>{lastActivityOrDueDate}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
