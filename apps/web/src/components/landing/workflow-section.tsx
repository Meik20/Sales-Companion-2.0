'use client'

import { Search, ShieldCheck, UserPlus, Kanban, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { useLandingCountry } from '@/features/landing/landing-country'

export function WorkflowSection() {
  const { lang } = useTranslation()
  const { country } = useLandingCountry()
  const isEn = lang === 'en'

  const steps = [
    {
      number: '01',
      title: isEn ? 'FIND' : 'TROUVEZ',
      subtitle: isEn
        ? 'Search for companies that match your ideal target.'
        : 'Recherchez les entreprises qui correspondent à votre cible.',
      details: isEn
        ? `Filter by city (${country.cities.join(', ')}), business sector, and company size.`
        : `Filtrez par ville (${country.cities.join(', ')}), secteur d’activité et type de structure.`,
      icon: Search,
      tag: isEn ? 'Smart Filters' : 'Filtres multicritères'
    },
    {
      number: '02',
      title: isEn ? 'QUALIFY' : 'QUALIFIEZ',
      subtitle: isEn
        ? 'Review available verified details before making contact.'
        : 'Consultez les informations disponibles avant de prendre contact.',
      details: isEn
        ? 'Access legal data (NIU, RCCM), verified phone numbers, and corporate emails.'
        : 'Vérifiez le RCCM, NIU, téléphones et adresses géographiques précises.',
      icon: ShieldCheck,
      tag: isEn ? 'Verified Profiles' : 'Fiches enrichies'
    },
    {
      number: '03',
      title: isEn ? 'PROSPECT' : 'PROSPECTEZ',
      subtitle: isEn
        ? 'Add target companies directly to your sales pipeline.'
        : 'Ajoutez les entreprises pertinentes à votre pipeline commercial.',
      details: isEn
        ? 'One-click import into your active pipeline without manual data re-entry.'
        : 'En 1 clic, l’entreprise devient un prospect actif dans votre espace de travail.',
      icon: UserPlus,
      tag: isEn ? '1-Click Add' : 'Import en 1 clic'
    },
    {
      number: '04',
      title: isEn ? 'TRACK' : 'SUIVEZ',
      subtitle: isEn
        ? 'Organize follow-ups, calls, and opportunities to closing.'
        : 'Organisez vos contacts, relances et opportunités.',
      details: isEn
        ? 'Kanban board (To Contact → In Negotiation → Won) for smooth deal progression.'
        : 'Tableau Kanban visuel pour ne plus jamais manquer une relance client.',
      icon: Kanban,
      tag: isEn ? 'Kanban Pipeline' : 'Pipeline visuel'
    }
  ]

  return (
    <section id="workflow" className="relative py-16 md:py-24 border-t border-border/80 bg-secondary/20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {isEn ? 'Proven Methodology' : 'Méthode en 4 étapes'}
          </span>
          <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl text-balance">
            {isEn
              ? 'From search to pipeline in a few clicks.'
              : 'De la recherche au pipeline, en quelques clics.'}
          </h2>
          <p className="mt-4 text-base text-muted-foreground text-pretty">
            {isEn
              ? 'A frictionless workflow built to accelerate your B2B sales cycle from day one.'
              : 'Un parcours fluide pensé pour transformer chaque recherche en opportunité commerciale concrète.'}
          </p>

          {/* Stepper badge sequence */}
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground shadow-2xs">
            <span className="text-[#1B7A3E]">{isEn ? 'Find' : 'Trouvez'}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-[#1B7A3E]">{isEn ? 'Qualify' : 'Qualifiez'}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-[#1B7A3E]">{isEn ? 'Prospect' : 'Prospectez'}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-[#1B7A3E]">{isEn ? 'Track' : 'Suivez'}</span>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => (
            <div
              key={step.number}
              className="relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-heading text-2xl font-black text-muted-foreground/40 font-mono">
                    {step.number}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                </div>

                <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {step.tag}
                </span>

                <h3 className="font-heading text-lg font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs font-medium text-foreground/90 leading-snug">
                  {step.subtitle}
                </p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {step.details}
                </p>
              </div>

              {idx < 3 && (
                <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-medium text-primary flex items-center gap-1">
                  <span>{isEn ? 'Next step' : 'Étape suivante'}</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
