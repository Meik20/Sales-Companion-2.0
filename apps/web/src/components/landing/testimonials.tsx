'use client'

import { useTranslation } from '@/providers/I18nProvider'

export function Testimonials() {
  const { t, lang } = useTranslation()

  const testimonials = [
    {
      quote: t('landing.testiSection.t1Text'),
      name: 'Thierry N.',
      role: t('landing.testiSection.t1Role'),
      initials: 'TN'
    },
    {
      quote: t('landing.testiSection.t2Text'),
      name: 'Marcelle K.',
      role: t('landing.testiSection.t2Role'),
      initials: 'MK'
    }
  ]

  return (
    <section id="temoignages" className="border-y border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            {lang === 'en' ? 'Testimonials' : 'Témoignages'}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
            {lang === 'en' ? 'Adopted by field sales teams' : 'Adopté par les commerciaux du terrain'}
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {testimonials.map((testi) => (
            <figure key={testi.name} className="flex flex-col justify-between rounded-2xl border border-border bg-card p-7 md:p-8 shadow-xs hover:border-primary/30 transition-colors">
              <blockquote className="font-heading text-base leading-relaxed text-foreground text-pretty italic">
                « {testi.quote} »
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {testi.initials}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{testi.name}</span>
                  <span className="block text-xs text-muted-foreground">{testi.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
