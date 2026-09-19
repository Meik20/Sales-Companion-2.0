'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, Building, ShieldCheck } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'

export function BlogSection() {
  const { lang } = useTranslation()

  const articles = [
    {
      slug: 'trouver-clients-b2b-cameroun-2026',
      title: lang === 'en'
        ? 'How to find B2B clients in Cameroon in 2026'
        : 'Comment trouver des clients B2B au Cameroun en 2026',
      desc: lang === 'en'
        ? 'Complete guide to identify, prospect and close B2B clients on the Cameroonian market.'
        : 'Guide complet pour identifier, prospecter et signer des clients B2B sur le marché camerounais.',
      badge: lang === 'en' ? 'B2B Prospecting' : 'Prospection B2B',
      readTime: '8 min',
      icon: BookOpen
    },
    {
      slug: 'annuaire-entreprises-btp-douala',
      title: lang === 'en'
        ? 'Construction company directory in Douala: 2026 guide'
        : 'Annuaire des entreprises BTP à Douala : le guide 2026',
      desc: lang === 'en'
        ? 'Find the right contacts and win deals in the construction sector.'
        : 'Identifiez les bons interlocuteurs et décrochez des marchés dans le secteur du bâtiment.',
      badge: lang === 'en' ? 'Specialized Directory' : 'Annuaire Spécialisé',
      readTime: '6 min',
      icon: Building
    },
    {
      slug: 'niu-rccm-identifier-entreprise-camerounaise',
      title: lang === 'en'
        ? 'NIU and RCCM: how to identify and qualify a company'
        : 'NIU et RCCM : comment identifier et qualifier une entreprise',
      desc: lang === 'en'
        ? 'Understand the NIU and RCCM to verify your prospects and secure your commercial contracts.'
        : 'Comprendre le NIU et le RCCM pour vérifier vos prospects et sécuriser vos contrats commercialement.',
      badge: lang === 'en' ? 'Legal & Tax Guide' : 'Guide Légal & Fiscal',
      readTime: '5 min',
      icon: ShieldCheck
    }
  ]

  return (
    <section id="blog" className="mx-auto max-w-6xl px-5 py-20 md:py-28 border-t border-border">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            {lang === 'en' ? 'Resources & Guides' : 'Ressources & Guides'}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
            {lang === 'en' ? 'Tips & B2B Sales in Cameroon' : 'Conseils & Vente B2B au Cameroun'}
          </h2>
        </div>
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline group"
        >
          {lang === 'en' ? 'All blog articles' : 'Tous les articles du blog'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {articles.map((art) => (
          <Link
            key={art.slug}
            href={`/blog/${art.slug}`}
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  <art.icon className="h-3.5 w-3.5" />
                  {art.badge}
                </span>
                <span className="text-xs text-muted-foreground">{art.readTime}</span>
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {art.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{art.desc}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/60 flex items-center text-xs font-medium text-primary group-hover:underline">
              {lang === 'en' ? 'Read the full article →' : "Lire l'article complet →"}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
