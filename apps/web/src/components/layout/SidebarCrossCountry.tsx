'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, ChevronDown, Check, Lock, Sparkles } from 'lucide-react'
import { SUPPORTED_COUNTRIES, type CountryCode } from '@sales-companion/shared'
import { CountryFlag } from '@/components/ui/CountrySelect'
import { useProspectingCountryDetails } from '@/hooks/useProspectingCountry'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from '@/providers/I18nProvider'
import { routes } from '@/constants/routes'

interface SidebarCrossCountryProps {
  onCloseAction?: () => void
}

export function SidebarCrossCountry({ onCloseAction }: SidebarCrossCountryProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const { pushToast } = useToast()
  const {
    code: activeCountryCode,
    setCountry,
    hasCrossCountry,
    isCountryLocked
  } = useProspectingCountryDetails()

  const [isOpen, setIsOpen] = useState(false)

  const handleSelectCountry = (targetCode: CountryCode, targetName: string) => {
    if (targetCode === activeCountryCode) {
      setIsOpen(false)
      return
    }

    const success = setCountry(targetCode)

    if (success) {
      pushToast({
        type: 'success',
        title: t('sidebar.countrySwitched')?.replace('{country}', targetName) ||
          `Plateforme basculée sur : ${targetName}`,
        description: `La base de données et les opportunités sont maintenant synchronisées avec ${targetName}.`
      })
      setIsOpen(false)
      // Redirige vers la recherche pour actualiser les données sans résidu de filtres région/ville
      router.push(routes.search)
      onCloseAction?.()
    } else {
      // L'utilisateur n'a pas accès : l'événement 'sc_cross_country_locked' a été déclenché
      // et la CrossCountryModal est automatiquement ouverte.
      // On ferme le menu mobile si besoin pour dégager la vue sur la modale.
      onCloseAction?.()
    }
  }

  return (
    <div className="flex flex-col my-0.5">
      {/* ── Entrée principale Cross Country dans le menu ───────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex w-full items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-all duration-200 cursor-pointer text-left ${
          isOpen
            ? 'bg-secondary/70 text-foreground font-semibold shadow-xs'
            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
        }`}
        title={t('sidebar.crossCountryDesc') || 'Prospection Panafricaine'}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Globe
            size={16}
            strokeWidth={1.8}
            className={`shrink-0 transition-colors ${
              isOpen || hasCrossCountry ? 'text-violet-500 dark:text-violet-400' : 'text-muted-foreground'
            }`}
          />
          <span className="truncate">{t('sidebar.crossCountry') || 'Cross Country'}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Drapeau du pays actuel */}
          <CountryFlag code={activeCountryCode} size="sm" />

          {/* Badge Enterprise si l'utilisateur est restreint */}
          {!hasCrossCountry && (
            <span
              className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/25"
              title="Disponible à partir du plan Enterprise"
            >
              <Lock size={9} className="shrink-0" />
              <span>Enterprise</span>
            </span>
          )}

          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-foreground' : ''
            }`}
          />
        </div>
      </button>

      {/* ── Liste déroulante des pays supportés ────────────────────── */}
      {isOpen && (
        <div className="mt-1 flex flex-col gap-0.5 pl-2 pr-1 py-1.5 rounded-lg bg-secondary/35 border border-border/50 transition-all animate-in fade-in-50 duration-150">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>{t('sidebar.selectCountry') || 'Changer de pays'}</span>
            {!hasCrossCountry && (
              <span className="text-[9.5px] text-violet-600 dark:text-violet-400 font-medium flex items-center gap-1">
                <Sparkles size={10} /> {t('sidebar.lockedForPlan') || 'Enterprise'}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            {SUPPORTED_COUNTRIES.map((country) => {
              const isCurrent = country.code === activeCountryCode
              const locked = isCountryLocked(country.code)

              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelectCountry(country.code, country.name)}
                  className={`group/item flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-[12px] transition-all duration-150 cursor-pointer text-left ${
                    isCurrent
                      ? 'bg-primary/15 text-primary font-bold shadow-xs border-l-2 border-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CountryFlag code={country.code} size="sm" />
                    <span className="truncate">{country.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-[10.5px] font-semibold text-primary">
                        <Check size={13} className="text-emerald-500 stroke-[2.5]" />
                      </span>
                    ) : locked ? (
                      <span
                        className="flex items-center gap-1 text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded"
                        title="Réservé au plan Enterprise — cliquez pour débloquer"
                      >
                        <Lock size={11} className="text-violet-500/80 shrink-0" />
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
