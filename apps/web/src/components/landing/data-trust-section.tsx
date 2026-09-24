'use client'

import { FileCheck, Shield, MapPin, RefreshCw, AlertCircle } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { useLandingCountry } from '@/features/landing/landing-country'

export function DataTrustSection() {
  const { lang } = useTranslation()
  const { country } = useLandingCountry()
  const isEn = lang === 'en'

  const pillars = [
    {
      icon: FileCheck,
      title: isEn ? 'Legal & Fiscal Identification' : 'Identification légale (RCCM & NIU)',
      desc: isEn
        ? 'Access Trade Register (RCCM) and Tax ID (NIU) numbers whenever available to verify legal existence before signing contracts.'
        : 'Retrouvez les numéros RCCM et NIU lorsqu’ils sont disponibles pour sécuriser vos relations commerciales avant la contractualisation.'
    },
    {
      icon: MapPin,
      title: isEn ? 'Granular Geographic Mapping' : 'Localisation par ville & quartier',
      desc: isEn
        ? `Filter companies across ${country.cities.join(', ')} and economic hubs by industrial zones and key neighborhoods.`
        : `Repérez les entreprises ${country.frenchIn}, notamment à ${country.cities.join(', ')}, pour optimiser vos tournées terrain.`
    },
    {
      icon: RefreshCw,
      title: isEn ? 'Continuous Enrichment' : 'Mise à jour et enrichissement continu',
      desc: isEn
        ? 'Structured and continuously updated database using multi-source aggregation and deduplication algorithms.'
        : 'Base structurée et enrichie en continu grâce à nos processus de déduplication et de normalisation des contacts.'
    },
    {
      icon: AlertCircle,
      title: isEn ? 'Collaborative Corrections' : 'Signalement d’informations en 1 clic',
      desc: isEn
        ? 'Notice a changed phone number or a relocated office? Users can flag outdated info to maintain maximum database accuracy.'
        : 'Un numéro a changé ? Une entreprise a déménagé ? Signalez-le en un clic pour contribuer à une base toujours plus fiable.'
    }
  ]

  return (
    <section className="relative py-16 md:py-24 bg-card border-t border-border/80">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1B7A3E]/30 bg-[#1B7A3E]/10 px-3 py-1 text-xs font-semibold text-[#1B7A3E]">
            <Shield className="h-3.5 w-3.5" />
            {isEn ? 'Data Transparency & Quality' : 'Transparence & Qualité'}
          </span>
          <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl text-balance">
            {isEn
              ? 'Structured data designed for your B2B sales.'
              : 'Des données structurées pour votre prospection.'}
          </h2>
          <p className="mt-4 text-base text-muted-foreground text-pretty">
            {isEn
              ? 'We focus on actionable, real-world data to empower sales teams without false claims or artificial vanity metrics.'
              : 'Nous privilégions des informations concrètes et actionnables pour vos équipes commerciales, avec une démarche claire et transparente.'}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl border border-border bg-background/60 p-6 shadow-xs transition-all hover:border-[#1B7A3E]/40 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <pillar.icon className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-base font-bold text-foreground">
                {pillar.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {pillar.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
