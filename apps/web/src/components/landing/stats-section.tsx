'use client'

import { Building2, Layers, MapPin, Smartphone } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { useLandingCountry } from '@/features/landing/landing-country'

export function StatsSection() {
  const { lang } = useTranslation()
  const { country } = useLandingCountry()
  const isEn = lang === 'en'

  const stats = [
    {
      icon: Building2,
      value: country.companyCount,
      label: isEn ? 'Listed companies' : 'Entreprises référencées',
      desc: isEn ? 'Structured & updated B2B data' : 'Données B2B structurées et à jour'
    },
    {
      icon: Layers,
      value: '30+',
      label: isEn ? 'Business sectors' : 'Secteurs d’activité',
      desc: isEn ? 'Construction, Agro, Tech, Services...' : 'BTP, Agro, Négoce, Services, Industrie...'
    },
    {
      icon: MapPin,
      value: String(country.regions),
      label: isEn ? 'Regions & main hubs' : 'Régions & métropoles',
      desc: country.cities.join(', '),
    },
    {
      icon: Smartphone,
      value: '100%',
      label: isEn ? 'Mobile & offline ready' : 'Prêt pour le terrain & mobile',
      desc: isEn ? 'PWA accessible even with low network' : 'PWA fluide même en connexion instable'
    }
  ]

  return (
    <section className="relative border-y border-border/80 bg-secondary/30 py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
            {isEn
              ? 'Everything you need to kickstart your B2B sales'
              : 'Tout ce qu’il faut pour démarrer votre prospection B2B'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isEn
              ? `Real, structured data designed for sales reps and managers in ${country.name}.`
              : `Des données réelles, structurées et pensées pour les commerciaux et dirigeants ${country.frenchIn}.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center text-center rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <item.icon className="h-6 w-6" />
              </div>
              <span className="font-heading text-3xl font-extrabold tracking-tight text-[#1B7A3E] sm:text-4xl">
                {item.value}
              </span>
              <span className="mt-1 font-heading text-sm font-semibold text-foreground">
                {item.label}
              </span>
              <span className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
