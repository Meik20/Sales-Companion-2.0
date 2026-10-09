'use client'

import { useLandingCountry } from '@/features/landing/landing-country'
import { useTranslation } from '@/providers/I18nProvider'

export function Testimonials() {
  const { lang } = useTranslation()
  const { country } = useLandingCountry()

  const isEn = lang === 'en'

  return (
    <section id="temoignages" className="border-y border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            {isEn ? 'Testimonials' : 'Témoignages'}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
            {isEn
              ? `Adopted by ${country.englishAdjective} field sales teams`
              : `Adopté par les équipes commerciales ${country.frenchAdjective}`}
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {country.testimonials.map((testi) => (
            <figure
              key={testi.name}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-7 md:p-8 shadow-xs hover:border-primary/30 transition-colors"
            >
              <blockquote className="font-heading text-base leading-relaxed text-foreground text-pretty italic">
                « {isEn ? testi.quoteEn : testi.quoteFr} »
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {testi.initials}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{testi.name}</span>
                  <span className="block text-xs text-muted-foreground">{testi.city}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
