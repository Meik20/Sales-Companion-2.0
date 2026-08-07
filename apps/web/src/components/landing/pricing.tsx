'use client'

import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'
import { routes } from '@/constants/routes'

const plans = [
  {
    name: 'Gratuit',
    price: '0',
    period: 'Pour toujours',
    description: 'Pour découvrir la plateforme et gérer un pipeline personnel.',
    features: ['10 recherches par mois', 'Accès à la base entreprises', 'Pipeline personnel', 'PWA mobile installable'],
    cta: 'Commencer gratuitement',
    highlighted: false,
    badge: null
  },
  {
    name: 'Starter',
    price: '5 000',
    period: 'FCFA / mois',
    description: 'Pour les commerciaux indépendants qui veulent accélérer leurs recherches.',
    features: [
      '10 recherches par jour',
      'Filtres avancés',
      'Export Excel 1-Click',
      'Pipeline personnel',
      'Support standard'
    ],
    cta: 'Choisir Starter',
    highlighted: false,
    badge: 'Standard'
  },
  {
    name: 'Pro',
    price: '15 000',
    period: 'FCFA / mois',
    description: 'Pour les commerciaux exigeants recherchant performance et accompagnement IA.',
    features: [
      '20 recherches par jour',
      'Companion IA commercial',
      'Pipeline illimité',
      'Recherches sauvegardées',
      'Export Excel illimité',
      'Support prioritaire'
    ],
    cta: 'Choisir Pro',
    highlighted: true,
    badge: '⭐ Recommandé'
  },
  {
    name: 'Enterprise',
    price: '50 000',
    period: 'FCFA / mois',
    description: 'Pour les équipes et directeurs commerciaux à Douala, Yaoundé et régions.',
    features: [
      '50 recherches par jour',
      'Tout le plan Pro inclus',
      'Dashboard manager temps réel',
      'Gestion d\'équipe & accès',
      'Assignation des prospects',
      'Import Excel de prospects'
    ],
    cta: 'Contacter l\'équipe',
    highlighted: false,
    badge: '💎 Équipes'
  }
]

export function Pricing() {
  return (
    <section id="tarifs" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Tarifs transparents</p>
        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
          Un plan qui s&apos;adapte à vos besoins
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          Commencez gratuitement avec 10 recherches par mois, passez à la vitesse supérieure quand vous êtes prêt.
        </p>
      </div>

      <div className="mt-14 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all hover:shadow-lg ${
              plan.highlighted
                ? 'border-primary bg-card shadow-xl shadow-primary/10 ring-2 ring-primary/20 lg:-mt-2 lg:mb-2'
                : 'border-border bg-card'
            }`}
          >
            <div>
              {plan.badge && (
                <span
                  className={`inline-block mb-3 rounded-full px-3 py-0.5 text-xs font-semibold ${
                    plan.highlighted
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground border border-border'
                  }`}
                >
                  {plan.badge}
                </span>
              )}

              <h3 className="font-heading text-xl font-semibold text-foreground flex items-center gap-2">
                {plan.name}
                {plan.name === 'Pro' && <Sparkles className="h-4 w-4 text-amber-500" />}
              </h3>
              <p className="mt-2 min-h-[40px] text-xs leading-relaxed text-muted-foreground">{plan.description}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-heading text-3xl font-bold tracking-tight text-foreground">
                  {plan.price}
                </span>
                <span className="text-xs text-muted-foreground font-medium">{plan.period}</span>
              </div>

              <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={routes.register}
              className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all shadow-xs ${
                plan.highlighted
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02]'
                  : 'border border-border bg-card text-foreground hover:bg-secondary hover:border-primary/40'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
