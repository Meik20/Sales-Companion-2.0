'use client'

import { Plus } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { useLandingCountry } from '@/features/landing/landing-country'

export function Faq() {
  const { lang } = useTranslation()
  const { country } = useLandingCountry()
  const isEn = lang === 'en'

  const faqs = [
    {
      question: isEn
        ? 'What is Sales Companion 2.0?'
        : 'Qu’est-ce que Sales Companion 2.0 ?',
      answer: isEn
        ? `Sales Companion 2.0 is a B2B sales intelligence platform tailored for the ${country.name} market. It allows you to search local companies, qualify prospects with legal and contact data, and manage your deals in an intuitive CRM pipeline.`
        : `Sales Companion 2.0 est une plateforme de prospection B2B conçue pour le marché de ${country.name}. Elle permet de rechercher des entreprises locales, d’identifier des prospects qualifiés et de suivre vos opportunités commerciales dans un CRM intégré.`
    },
    {
      question: isEn
        ? 'How many companies are listed in the database?'
        : 'Combien d’entreprises sont disponibles dans la base ?',
      answer: isEn
        ? `Sales Companion 2.0 currently provides access to ${country.companyCount.toLowerCase()} companies across ${country.cities.join(', ')}, with continuous updates and additions.`
        : `Sales Companion 2.0 donne accès à ${country.companyCount.toLowerCase()} entreprises réparties à ${country.cities.join(', ')}, avec une actualisation continue.`
    },
    {
      question: isEn
        ? 'Is the data verified and structured?'
        : 'Les données sont-elles vérifiées et à jour ?',
      answer: isEn
        ? 'Our data is structured and normalized from official registries and verified business directories. We provide legal identifiers (RCCM, NIU) and direct phone numbers whenever available, and users can flag outdated info in one click.'
        : 'Nos données sont structurées et normalisées à partir de sources officielles et d’annuaires professionnels. Vous retrouvez les informations légales (RCCM, NIU) et coordonnées directes lorsqu’elles sont disponibles, et chaque utilisateur peut signaler toute information à mettre à jour en 1 clic.'
    },
    {
      question: isEn
        ? 'Can I use Sales Companion 2.0 on my smartphone?'
        : 'Puis-je utiliser Sales Companion 2.0 sur mon téléphone ?',
      answer: isEn
        ? 'Yes. Sales Companion 2.0 is designed as a Progressive Web App (PWA). You can install it directly onto your Android or iPhone home screen without needing an app store, perfectly suited for mobile sales reps.'
        : 'Oui. Sales Companion 2.0 est conçu comme une Progressive Web App (PWA). Vous pouvez l’installer directement sur l’écran d’accueil de votre téléphone (Android ou iPhone) sans passer par un store, idéal pour les commerciaux sur le terrain.'
    },
    {
      question: isEn
        ? 'What happens when I lose internet connectivity?'
        : 'Que se passe-t-il lorsque je n’ai plus de connexion Internet ?',
      answer: isEn
        ? 'The app features an intelligent field cache: previously viewed companies and prospect details remain accessible offline so you can continue your field visits even with unstable or zero connectivity.'
        : 'L’application intègre un mode hors-ligne : les entreprises et fiches consultées restent mises en cache sur votre appareil pour vous permettre de préparer et réaliser vos visites même en cas de réseau instable ou absent.'
    },
    {
      question: isEn
        ? 'Can I collaborate with my sales team?'
        : 'Puis-je travailler avec une équipe commerciale ?',
      answer: isEn
        ? 'Yes. Our team plans allow you to centralize company accounts, assign leads to specific sales reps, prevent prospect duplication, and monitor global pipeline velocity in real time.'
        : 'Oui. Nos offres adaptées aux équipes permettent de centraliser les comptes, d’attribuer des prospects à des commerciaux spécifiques, d’éviter les doublons et de piloter l’avancement global du pipeline en temps réel.'
    },
    {
      question: isEn
        ? 'Can I export my company data and leads?'
        : 'Puis-je exporter mes données et prospects ?',
      answer: isEn
        ? 'Yes. Depending on your subscription plan, you can export targeted company lists and leads to Excel or CSV formats to enrich your reporting tools or external outreach campaigns.'
        : 'Oui. Selon votre offre, vous pouvez exporter vos listes d’entreprises et prospects ciblés aux formats Excel ou CSV pour alimenter vos outils de reporting ou vos campagnes commerciales.'
    },
    {
      question: isEn
        ? 'Is there a free plan available?'
        : 'Existe-t-il une offre gratuite ?',
      answer: isEn
        ? 'Yes! Our free plan allows you to explore Sales Companion 2.0 with no credit card required, including 10 free searches per month and full access to core pipeline management.'
        : 'Oui ! Notre offre gratuite permet de découvrir Sales Companion 2.0 sans carte bancaire, avec 10 recherches offertes par mois et un accès complet aux fonctionnalités de base du pipeline.'
    }
  ]

  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20 md:py-28 border-t border-border">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          {isEn ? 'Frequently asked questions' : 'Questions fréquentes'}
        </p>
        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
          {isEn ? 'Everything you need to know' : 'Tout ce que vous devez savoir'}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {isEn
            ? 'Clear and transparent answers about our data, features, and pricing.'
            : 'Des réponses claires et transparentes sur nos données, fonctionnalités et abonnements.'}
        </p>
      </div>

      <div className="mt-12 space-y-3.5">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-xl border border-border bg-card px-5 transition-all open:shadow-xs open:border-primary/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-heading text-base font-semibold text-foreground select-none">
              <span>{faq.question}</span>
              <Plus className="h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45" />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-muted-foreground border-t border-border/40 pt-3">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}
