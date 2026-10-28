'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/providers/I18nProvider'
import {
  ShieldAlert,
  ShieldOff,
  Building2,
  Users,
  UserCheck,
  Layers,
  AlertTriangle,
  BadgeCheck,
  X,
  CheckCircle2,
  TrendingUp,
  Flame,
  Clock
} from 'lucide-react'

export interface ProspectConflictInfo {
  companyName: string
  status: string
  teamManagerName?: string | null
  teamManagerUid?: string | null
  assignedMemberName?: string | null
  assignedMemberUid?: string | null
  segment?: string | null
  isSameTeam?: boolean
  isSameUser?: boolean
  isFromManagerProspects?: boolean
  isConcluded?: boolean
  updatedAt?: string | null
}

interface ProspectConflictModalProps {
  conflict: ProspectConflictInfo | null
  onClose: () => void
}

export function ProspectConflictModal({ conflict, onClose }: ProspectConflictModalProps) {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (conflict) {
      window.addEventListener('keydown', handleKeyDown)
      const main = document.getElementById('main-scroll-container')
      const prevOverflow = main ? main.style.overflowY : ''
      if (main) main.style.overflowY = 'hidden'

      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        if (main) main.style.overflowY = prevOverflow
      }
    }
  }, [conflict, handleKeyDown])

  if (!conflict || !mounted) return null

  const isSameUser = conflict.isSameUser
  const isConcluded = conflict.isConcluded === true
  const rawStatus = (conflict.status || '').toLowerCase().trim()

  // Configuration du badge de statut
  const getStatusBadge = () => {
    if (isConcluded || rawStatus === 'conclue' || rawStatus === 'won') {
      return {
        label: t('search.conflictStatusConclue') || 'Client conclu',
        icon: CheckCircle2,
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-500/30'
      }
    }
    if (rawStatus === 'negociation' || rawStatus === 'negotiation') {
      return {
        label: t('search.conflictStatusNegociation') || 'En négociation',
        icon: TrendingUp,
        bg: 'bg-violet-500/15',
        text: 'text-violet-700 dark:text-violet-400',
        border: 'border-violet-500/30'
      }
    }
    if (rawStatus === 'prospection' || rawStatus === 'prospect' || rawStatus === 'lead') {
      return {
        label: t('search.conflictStatusProspection') || 'En prospection',
        icon: Flame,
        bg: 'bg-amber-500/15',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-500/30'
      }
    }
    return {
      label: t('search.conflictStatusNew') || "En attente d'attribution",
      icon: Clock,
      bg: 'bg-sky-500/15',
      text: 'text-sky-700 dark:text-sky-400',
      border: 'border-sky-500/30'
    }
  }

  const statusBadge = getStatusBadge()
  const StatusIcon = statusBadge.icon

  // Variante visuelle selon le type de conflit
  const isConcludedConflict = isConcluded && !isSameUser
  const headerIconBg = isConcludedConflict
    ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
    : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
  const haloColor = isConcludedConflict ? '#ef4444' : '#f59e0b'
  const boxShadowColor = isConcludedConflict
    ? '0 25px 50px -12px rgba(239, 68, 68, 0.22), 0 0 0 1px var(--border, rgba(0,0,0,0.08))'
    : '0 25px 50px -12px rgba(245, 158, 11, 0.25), 0 0 0 1px var(--border, rgba(0,0,0,0.08))'
  const warningBg = isConcludedConflict
    ? 'border-red-500/20 bg-red-500/5'
    : 'border-amber-500/20 bg-amber-500/5'
  const warningTextColor = isConcludedConflict
    ? 'text-red-900/90 dark:text-red-200/90'
    : 'text-amber-900/90 dark:text-amber-200/90'
  const warningIconColor = isConcludedConflict
    ? 'text-red-600 dark:text-red-400'
    : 'text-amber-600 dark:text-amber-400'

  const HeaderIcon = isConcludedConflict ? ShieldOff : ShieldAlert

  // Titre et sous-titre selon le contexte
  const getTitle = () => {
    if (isSameUser) return t('search.conflictModalSelfTitle')
    if (isConcludedConflict) return t('search.conflictModalConcludedTitle') || 'Client existant dans votre organisation'
    return t('search.conflictModalTitle')
  }

  const getSubtitle = () => {
    if (isConcludedConflict) return t('search.conflictModalConcludedSubtitle') || 'Cette entreprise est déjà cliente dans votre organisation.'
    return t('search.conflictModalSubtitle')
  }

  // Message d'avertissement
  const getWarningDesc = () => {
    if (isSameUser) return t('search.conflictSelfDesc')
    if (isConcludedConflict) return t('search.conflictConcludedDesc') || "Cette entreprise est déjà enregistrée comme cliente dans votre organisation (affaire conclue). Pour éviter tout cannibalisme commercial, vous ne pouvez pas l'ajouter à nouveau comme prospect."
    return t('search.conflictWarningDesc')
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
    >
      {/* Backdrop sombre non flou conforme Règle UI §8 */}
      <div
        aria-hidden="true"
        className="fixed inset-0 transition-opacity duration-200"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.65)'
        }}
        onClick={onClose}
      />

      {/* Boîte Modale 100% opaque */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all duration-200"
        style={{
          position: 'relative',
          zIndex: 10,
          backgroundColor: 'var(--card, #ffffff)',
          borderColor: 'var(--border, rgba(255, 255, 255, 0.12))',
          boxShadow: boxShadowColor
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Halo en arrière-plan (ambré ou rouge selon le type) */}
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-36 w-72 -translate-x-1/2 rounded-full blur-3xl opacity-20"
          style={{ background: haloColor }}
        />

        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors cursor-pointer"
          aria-label={t('common.close') || 'Fermer'}
        >
          <X size={18} />
        </button>

        {/* En-tête */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className={`rounded-xl p-3 border shrink-0 ${headerIconBg}`}>
            <HeaderIcon size={26} strokeWidth={2.2} />
          </div>
          <div>
            <h2
              id="conflict-dialog-title"
              className="text-lg font-bold text-foreground leading-snug"
            >
              {getTitle()}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getSubtitle()}
            </p>
          </div>
        </div>

        {/* Fiche d'information du prospect en conflit */}
        <div className="space-y-3.5 mb-5">
          {/* Entreprise & Statut */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-background/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Building2 size={18} className="text-muted-foreground shrink-0" />
              <div className="truncate">
                <span className="text-[11px] font-medium text-muted-foreground block uppercase tracking-wider">
                  {t('search.conflictCompany')}
                </span>
                <span className="text-sm font-semibold text-foreground truncate block">
                  {conflict.companyName}
                </span>
              </div>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
            >
              <StatusIcon size={12} strokeWidth={2.5} />
              <span>{statusBadge.label}</span>
            </div>
          </div>

          {/* Détails d'affectation : Team Manager & Commercial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Team Manager */}
            <div className="p-3 rounded-xl border border-border/60 bg-muted/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Users size={13} className="text-primary/70 shrink-0" />
                <span className="font-medium">{t('search.conflictTeamManager')}</span>
              </div>
              <p className="text-sm font-bold text-foreground truncate">
                {conflict.teamManagerName || 'Team Manager'}
              </p>
            </div>

            {/* Commercial assigné */}
            <div className="p-3 rounded-xl border border-border/60 bg-muted/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <UserCheck size={13} className="text-emerald-500/80 shrink-0" />
                <span className="font-medium">{t('search.conflictAssignedMember')}</span>
              </div>
              <p
                className={`text-sm font-bold truncate ${
                  conflict.assignedMemberName
                    ? 'text-foreground'
                    : 'text-muted-foreground/90 font-normal italic'
                }`}
              >
                {conflict.assignedMemberName || t('search.conflictUnassigned')}
              </p>
            </div>
          </div>

          {/* Badge "Client conclu" si isConcluded */}
          {isConcludedConflict && (
            <div className="px-3.5 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2">
              <BadgeCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {t('search.conflictStatusConclue') || 'Client conclu'} —&nbsp;
                {conflict.updatedAt
                  ? new Date(conflict.updatedAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })
                  : t('search.conflictDateUnknown') || 'Date inconnue'}
              </span>
            </div>
          )}

          {/* Segment d'activité si renseigné */}
          {conflict.segment && (
            <div className="px-3.5 py-2.5 rounded-xl border border-border/60 bg-muted/20 flex items-center gap-2">
              <Layers size={14} className="text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                {t('search.conflictSegment')} :
              </span>
              <span className="text-xs font-semibold text-foreground">
                {conflict.segment}
              </span>
            </div>
          )}

          {/* Message explicatif et conseil d'action */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${warningBg}`}>
            <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${warningIconColor}`} />
            <p className={`text-xs leading-relaxed ${warningTextColor}`}>
              {getWarningDesc()}
            </p>
          </div>
        </div>

        {/* Bouton d'action unique */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-150 shadow-sm cursor-pointer"
          >
            {t('search.conflictClose') || 'Compris'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
