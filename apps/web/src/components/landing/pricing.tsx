'use client'

import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'
import { routes } from '@/constants/routes'
import { useTranslation } from '@/providers/I18nProvider'
import { useLandingCountry } from '@/features/landing/landing-country'

export function Pricing() {
  const { t, lang } = useTranslation()

  const { country } = useLandingCountry()
  const plans = [
    {
      name: t('landing.plansSection.free'),
      price: t('landing.plansSection.freePrice'),
      period: t('landing.plansSection.freePeriod'),
      description: lang === 'en'
        ? 'Discover the platform and manage a personal pipeline.'
        : 'Pour découvrir la plateforme et gérer un pipeline personnel.',
      features: [
        t('landing.plansSection.pFree1'),
        t('landing.plansSection.pFree2'),
        t('landing.plansSection.pFree3'),
        t('landing.plansSection.pFree4')
      ],
      cta: t('landing.plansSection.startFreeBtn'),
      highlighted: false,
      badge: null
    },
    {
      name: t('landing.plansSection.starter'),
      price: t('landing.plansSection.starterPrice'),
      period: `${country.currency} / ${t('landing.plansSection.starterPeriod')}`,
      description: lang === 'en'
        ? 'For independent sales reps who want to accelerate their searches.'
        : 'Pour les commerciaux indépendants qui veulent accélérer leurs recherches.',
      features: [
        t('landing.plansSection.pStarter1'),
        t('landing.plansSection.pStarter2'),
        t('landing.plansSection.pStarter3'),
        t('landing.plansSection.pStarter4'),
        lang === 'en' ? 'Standard support' : 'Support standard'
      ],
      cta: t('landing.plansSection.chooseStarterBtn'),
      highlighted: false,
      badge: t('landing.plansSection.starterBadge')
    },
    {
      name: t('landing.plansSection.pro'),
      price: t('landing.plansSection.proPrice'),
      period: `${country.currency} / ${t('landing.plansSection.proPeriod')}`,
      description: lang === 'en'
        ? 'For top sales reps seeking performance and AI assistance.'
        : 'Pour les commerciaux exigeants recherchant performance et accompagnement IA.',
      features: [
        t('landing.plansSection.pPro1'),
        t('landing.plansSection.pPro2'),
        t('landing.plansSection.pPro3'),
        t('landing.plansSection.pPro4'),
        t('landing.plansSection.pPro5'),
        t('landing.plansSection.pPro6')
      ],
      cta: t('landing.plansSection.chooseProBtn'),
      highlighted: true,
      badge: `⭐ ${t('landing.plansSection.proBadge')}`
    },
    {
      name: t('landing.plansSection.enterprise'),
      price: t('landing.plansSection.enterprisePrice'),
      period: `${country.currency} / ${t('landing.plansSection.enterprisePeriod')}`,
      description: lang === 'en'
        ? `For teams and sales directors in ${country.cities.join(', ')} and beyond.`
        : `Pour les équipes et directeurs commerciaux à ${country.cities.join(', ')} et dans les autres régions.`,
      features: [
        t('landing.plansSection.pEnterprise1'),
        t('landing.plansSection.pEnterprise2'),
        t('landing.plansSection.pEnterprise3'),
        t('landing.plansSection.pEnterprise4'),
        t('landing.plansSection.pEnterprise5'),
        t('landing.plansSection.pEnterprise6')
      ],
      cta: t('landing.plansSection.contactEnterpriseBtn'),
      highlighted: false,
      badge: `💎 ${t('landing.plansSection.enterpriseBadge')}`
    }
  ]

  return (
    <section id="tarifs" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          {lang === 'en' ? 'Transparent pricing' : 'Tarifs transparents'}
        </p>
        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
          {lang === 'en' ? 'A plan that fits your needs' : "Un plan qui s'adapte à vos besoins"}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          {lang === 'en'
            ? 'Start for free with 10 searches per month, upgrade when you are ready.'
            : 'Commencez gratuitement avec 10 recherches par mois, passez à la vitesse supérieure quand vous êtes prêt.'}
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
                {plan.highlighted && <Sparkles className="h-4 w-4 text-amber-500" />}
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
