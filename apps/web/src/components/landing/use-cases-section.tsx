'use client'

import Link from 'next/link'
import { Briefcase, Users, Building, ArrowRight, Check } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { routes } from '@/constants/routes'

export function UseCasesSection() {
  const { lang } = useTranslation()
  const isEn = lang === 'en'

  const personas = [
    {
      icon: Briefcase,
      role: isEn ? 'Field Sales Rep' : 'Commercial terrain',
      headline: isEn
        ? 'Find businesses to prospect before heading into the field.'
        : 'Trouvez les entreprises à prospecter avant même de partir sur le terrain.',
      bullets: isEn
        ? [
            'Filter by neighborhood (Akwa, Bastos, Bonanjo...) to plan dense visits',
            'Quick access to verified phone numbers and GPS addresses on mobile',
            'PWA works smoothly even during network drops in transit'
          ]
        : [
            'Filtrage par quartier (Akwa, Bastos, Bonanjo...) pour préparer vos tournées',
            'Accès direct aux numéros et adresses sur smartphone',
            'Application fluide même avec un réseau mobile instable'
          ],
      ctaText: isEn ? 'Explore for Sales Reps' : 'Voir la solution commerciale'
    },
    {
      icon: Users,
      role: isEn ? 'Sales Manager & Director' : 'Responsable commercial',
      headline: isEn
        ? 'Give your sales team a shared database and track pipeline performance.'
        : 'Donnez à votre équipe une base commune pour prospecter et suivre les opportunités.',
      bullets: isEn
        ? [
            'Centralize prospects and prevent two reps from calling the same company',
            'Track pipeline status in real time (To Contact, Follow-up, Closed Won)',
            'Monitor team activity metrics and assign targeted territory accounts'
          ]
        : [
            'Centralisez les comptes pour éviter les doublons de prospection',
            'Suivez l’avancement du pipeline en temps réel par commercial',
            'Pilotez les relances et mesurez l’efficacité des campagnes'
          ],
      ctaText: isEn ? 'Discover Team Management' : 'Découvrir la gestion d’équipe'
    },
    {
      icon: Building,
      role: isEn ? 'SME & Business Leader' : 'PME / Dirigeant',
      headline: isEn
        ? 'Structure your B2B sales without multiplying complex tools.'
        : 'Construisez votre prospection B2B sans multiplier les outils.',
      bullets: isEn
        ? [
            'No need to pay for 4 different software subscriptions or complex CRMs',
            'Immediate access to 50,000+ businesses ready to be prospected',
            'Turn every commercial meeting into structured, trackable revenue'
          ]
        : [
            'Inutile d’empiler 4 abonnements logiciels coûteux ou un CRM complexe',
            'Accès immédiat à un annuaire riche de 50 000+ entreprises locales',
            'Passez du bouche-à-oreille à une prospection commerciale structurée'
          ],
      ctaText: isEn ? 'Discover Sales Companion' : 'Découvrir Sales Companion'
    }
  ]

  return (
    <section className="relative py-16 md:py-24 bg-background">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {isEn ? 'Tailored Solutions' : 'Cas d’utilisation'}
          </span>
          <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl text-balance">
            {isEn
              ? 'Built for teams driving B2B sales in Cameroon.'
              : 'Pensé pour ceux qui vivent de la prospection B2B.'}
          </h2>
          <p className="mt-4 text-base text-muted-foreground text-pretty">
            {isEn
              ? 'Whether you are in the field closing deals, leading a sales department, or growing a business.'
              : 'Que vous soyez sur le terrain, à la tête d’une force de vente ou dirigeant d’entreprise.'}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {personas.map((persona) => (
            <div
              key={persona.role}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-1"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5">
                  <persona.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {persona.role}
                </span>
                <h3 className="mt-2 font-heading text-lg font-bold text-foreground leading-snug">
                  {persona.headline}
                </h3>

                <ul className="mt-5 space-y-2.5">
                  {persona.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                      <Check className="h-4 w-4 shrink-0 text-[#1B7A3E] mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-5 border-t border-border/60">
                <Link
                  href={routes.register}
                  className="inline-flex items-center gap-2 text-xs font-bold text-primary transition-colors hover:text-primary/80"
                >
                  <span>{persona.ctaText}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
