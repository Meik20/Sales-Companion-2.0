'use client'

import { Plus } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'

export function Faq() {
  const { t, lang } = useTranslation()

  const faqs = [
    {
      question: t('landing.faqSection.q1'),
      answer: t('landing.faqSection.a1')
    },
    {
      question: t('landing.faqSection.q2'),
      answer: t('landing.faqSection.a2')
    },
    {
      question: t('landing.faqSection.q3'),
      answer: t('landing.faqSection.a3')
    },
    {
      question: t('landing.faqSection.q4'),
      answer: t('landing.faqSection.a4')
    }
  ]

  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20 md:py-28 border-t border-border">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          {lang === 'en' ? 'Frequently asked questions' : 'Questions fréquentes'}
        </p>
        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
          {lang === 'en' ? 'Everything you need to know' : 'Tout ce que vous devez savoir'}
        </h2>
      </div>

      <div className="mt-12 space-y-3.5">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-xl border border-border bg-card px-5 transition-all open:shadow-sm open:border-primary/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-heading text-base font-medium text-foreground select-none">
              <span>{faq.question}</span>
              <Plus className="h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45" />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-muted-foreground border-t border-border/40 pt-3">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
