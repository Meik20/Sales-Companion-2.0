'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Lock, ShieldCheck, Sparkles, X, ArrowRight, Building2 } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getCountryName, type CountryCode } from '@sales-companion/shared'
import { CountryFlag } from '@/components/ui/CountrySelect'
import { useTranslation } from '@/providers/I18nProvider'
import { routes } from '@/constants/routes'

interface CrossCountryModalProps {
  isOpen?: boolean
  onCloseAction?: () => void
  targetCountryCode?: CountryCode | null
}

export function CrossCountryModal({
  isOpen: controlledIsOpen,
  onCloseAction,
  targetCountryCode: controlledTargetCountry
}: CrossCountryModalProps) {
  const router = useRouter()
  const { user } = useCurrentUser()
  const { lang } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [targetCountry, setTargetCountry] = useState<CountryCode | null>(null)

  // Écoute de l'événement global 'sc_cross_country_locked'
  useEffect(() => {
    const handleLocked = (e: Event) => {
      const customEvent = e as CustomEvent<{ targetCountry?: CountryCode }>
      if (customEvent.detail?.targetCountry) {
        setTargetCountry(customEvent.detail.targetCountry)
      }
      setIsOpen(true)
    }

    window.addEventListener('sc_cross_country_locked', handleLocked)
    return () => window.removeEventListener('sc_cross_country_locked', handleLocked)
  }, [])

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen)
    }
  }, [controlledIsOpen])

  useEffect(() => {
    if (controlledTargetCountry !== undefined) {
      setTargetCountry(controlledTargetCountry)
    }
  }, [controlledTargetCountry])

  const handleClose = () => {
    setIsOpen(false)
    onCloseAction?.()
  }

  if (!isOpen) return null

  const targetCountryName = targetCountry
    ? getCountryName(targetCountry, lang)
    : lang === 'en'
      ? 'this country'
      : 'ce pays'

  const isSeniorManager = user?.role === 'manager' && user?.orgRole === 'senior_manager'
  const isIndependent = user?.role === 'independent' || (!user?.role && !user?.orgCode)
  const canDirectlyUpgrade = isSeniorManager || isIndependent

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cross-country-title"
      >
        {/* Bouton fermer */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label={lang === 'en' ? 'Close' : 'Fermer'}
        >
          <X size={18} />
        </button>

        {/* En-tête avec badge Enterprise */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-600 dark:text-purple-400">
            <Lock size={12} className="shrink-0" />
            {lang === 'en' ? 'Enterprise Cross-Country Feature' : 'Option Cross-Country Enterprise'}
          </span>
          {targetCountry && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-xs text-foreground font-medium">
              <CountryFlag code={targetCountry} size="sm" />
              {targetCountryName}
            </span>
          )}
        </div>

        <h3 id="cross-country-title" className="text-xl font-bold text-foreground">
          {lang === 'en'
            ? 'Pan-African Multi-Country Prospection'
            : 'Prospection Panafricaine Multi-Pays'}
        </h3>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {lang === 'en' ? (
            <>
              Access to foreign B2B databases ({targetCountryName}) and cross-border pipeline development
              are exclusively reserved for{' '}
              <strong className="text-foreground font-semibold">Enterprise</strong> plan subscribers.
            </>
          ) : (
            <>
              L&apos;accès aux bases de données B2B de pays tiers ({targetCountryName}) et le développement de
              pipelines transfrontaliers sont exclusivement réservés aux abonnés du forfait{' '}
              <strong className="text-foreground font-semibold">Enterprise</strong>.
            </>
          )}
        </p>

        {/* Avantages de l'option */}
        <div className="mt-4 space-y-2 rounded-xl border border-border/80 bg-secondary/30 p-3.5 text-xs">
          {lang === 'en' ? (
            <>
              <div className="flex items-start gap-2.5 text-foreground">
                <Globe size={16} className="text-purple-500 shrink-0 mt-0.5" />
                <span>
                  <strong>7 Pan-African B2B Markets:</strong> Cameroon, Senegal, Ivory Coast, Benin,
                  Togo, Chad, Central African Republic.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-foreground">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>International Pipeline:</strong> Segment and track your business opportunities
                  across CEMAC &amp; WAEMU economic zones.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-foreground">
                <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>50 searches / day:</strong> Extended quota to prospect intensively across
                  multiple territories.
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2.5 text-foreground">
                <Globe size={16} className="text-purple-500 shrink-0 mt-0.5" />
                <span>
                  <strong>7 Marchés B2B Panafricains :</strong> Cameroun, Sénégal, Côte d&apos;Ivoire, Bénin,
                  Togo, Tchad, Centrafrique.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-foreground">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Pipeline International :</strong> Segmentez et suivez vos opportunités
                  d&apos;affaires dans toute la zone CEMAC &amp; UEMOA.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-foreground">
                <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>50 recherches / jour :</strong> Quota étendu pour prospecter intensivement sur
                  plusieurs territoires.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Message contextuel selon le rôle */}
        <div className="mt-5">
          {canDirectlyUpgrade ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                {lang === 'en' ? 'Later' : 'Plus tard'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose()
                  router.push(`${routes.upgrade}?plan=enterprise`)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 transition-colors"
              >
                <span>{lang === 'en' ? 'Upgrade to Enterprise plan' : 'Passer au forfait Enterprise'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <Building2 size={16} className="shrink-0 mt-0.5" />
                <p>
                  {lang === 'en' ? (
                    <>
                      Your account is attached to an organization. Please contact your{' '}
                      <strong>Senior Manager</strong> to upgrade your company subscription to the{' '}
                      <strong>Enterprise</strong> plan and unlock Cross-Country prospection for your team.
                    </>
                  ) : (
                    <>
                      Votre compte est rattaché à une organisation. Veuillez vous rapprocher de votre{' '}
                      <strong>Senior Manager</strong> pour faire évoluer le forfait de l&apos;entreprise
                      vers le plan <strong>Enterprise</strong> afin de débloquer le Cross-Country pour
                      l&apos;équipe.
                    </>
                  )}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                >
                  {lang === 'en' ? 'Understood' : 'Compris'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
