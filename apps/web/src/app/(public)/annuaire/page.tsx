import { Metadata } from 'next'
import Link from 'next/link'
import { PublicNav } from '@/components/landing/PublicNav'
import { PublicFooter } from '@/components/landing/PublicFooter'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://salescompanion2-0.com'

export const metadata: Metadata = {
  title: 'Base de Données Entreprises Cameroun — 50 000+ Sociétés | Annuaire B2B',
  description:
    'Accédez à la base de données la plus complète des entreprises camerounaises. 50 000+ sociétés vérifiées (RCCM/NIU) à Douala, Yaoundé, Bafoussam et dans toute la CEMAC. Filtrez par secteur et exportez vos listes de prospection B2B.',
  keywords: [
    'base de données entreprises Cameroun',
    'annuaire entreprises Cameroun',
    'liste entreprises Douala',
    'liste entreprises Yaoundé',
    'annuaire B2B Cameroun',
    'prospection B2B Cameroun',
    'RCCM Cameroun',
    'NIU Cameroun'
  ],
  alternates: { canonical: `${baseUrl}/annuaire` },
  openGraph: {
    title: 'Base de Données Entreprises Cameroun — Annuaire B2B 50 000+ Sociétés',
    description:
      '50 000+ entreprises camerounaises vérifiées. Filtrez par ville et secteur. La référence pour la prospection B2B au Cameroun.',
    url: `${baseUrl}/annuaire`,
    siteName: 'Sales Companion 2.0',
    type: 'website'
  }
}

const FAQ_ITEMS = [
  {
    question: "Qu'existe-t-il comme base de données d'entreprises au Cameroun ?",
    answer:
      "Sales Companion 2.0 est la base de données d'entreprises camerounaises la plus complète disponible en ligne. Elle recense plus de 50 000 sociétés vérifiées à Douala, Yaoundé, Bafoussam, Garoua et Bamenda, avec leurs informations légales (RCCM, NIU), contacts de dirigeants et secteurs d'activité."
  },
  {
    question: 'Comment trouver la liste des entreprises à Douala ?',
    answer:
      "Via l'annuaire Sales Companion 2.0, vous pouvez filtrer les entreprises de Douala par quartier (Bonanjo, Akwa, Bali, Bassa, Bonabéri) et par secteur (BTP, commerce, tech, finance). Plus de 15 000 entreprises de Douala sont référencées."
  },
  {
    question: 'La base de données est-elle à jour ?',
    answer:
      'Oui, la base est mise à jour en continu à partir de sources officielles (RCCM, registres fiscaux) et de vérifications terrain. Les entreprises fermées ou inactives sont signalées et retirées régulièrement.'
  },
  {
    question: 'Peut-on exporter la liste des entreprises au format Excel ?',
    answer:
      'Oui. Avec un abonnement Sales Companion 2.0, vous pouvez créer des listes de prospection filtrées et les exporter au format CSV/Excel pour les intégrer dans vos outils de vente ou votre CRM.'
  },
  {
    question: "L'accès à la base de données est-il gratuit ?",
    answer:
      "Une version d'essai gratuite est disponible pour découvrir la plateforme. L'accès complet (export, contacts dirigeants, filtres avancés) nécessite un abonnement. Les tarifs sont disponibles en XAF, adaptés au marché camerounais."
  }
]

export default function AnnuaireHub() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  }

  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Base de Données Entreprises Cameroun',
    description:
      "Base de données de plus de 50 000 entreprises camerounaises vérifiées, incluant leurs informations légales (RCCM, NIU), contacts et secteurs d'activité.",
    url: `${baseUrl}/annuaire`,
    creator: {
      '@type': 'Organization',
      name: 'Sales Companion 2.0',
      url: baseUrl
    },
    spatialCoverage: 'Cameroun',
    temporalCoverage: '2026',
    license: `${baseUrl}/terms`,
    keywords: 'entreprises cameroun, RCCM, NIU, prospection B2B, Douala, Yaoundé'
  }

  const regions = [
    { name: 'Douala', slug: 'douala', count: '15 000+' },
    { name: 'Yaoundé', slug: 'yaounde', count: '12 000+' },
    { name: 'Bafoussam', slug: 'bafoussam', count: '3 500+' },
    { name: 'Garoua', slug: 'garoua', count: '2 100+' },
    { name: 'Bamenda', slug: 'bamenda', count: '1 800+' }
  ]

  const secteurs = [
    { name: 'Bâtiment & Travaux Publics (BTP)', slug: 'btp', icon: '🏗️' },
    { name: "Technologies de l'Information (Tech)", slug: 'tech', icon: '💻' },
    { name: 'Banque, Finance & Assurance', slug: 'finance', icon: '🏦' },
    { name: 'Logistique & Transport', slug: 'logistique', icon: '🚚' },
    { name: 'Agroalimentaire & Agriculture', slug: 'agro', icon: '🌾' },
    { name: 'Commerce & Distribution', slug: 'commerce', icon: '🛒' }
  ]

  const STATS = [
    { value: '50 000+', label: 'Entreprises indexées' },
    { value: '6', label: 'Secteurs couverts' },
    { value: '5', label: 'Villes disponibles' },
    { value: 'RCCM/NIU', label: 'Données vérifiées' }
  ]

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />

      <PublicNav activePage="annuaire" />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-white py-16 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,#1B7A3E_8%,transparent),transparent)]"
        />
        <div className="mx-auto max-w-3xl px-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#1B7A3E] animate-pulse" />
            Base de Données Cameroun
          </span>
          <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Base de Données <span className="text-[#1B7A3E]">Entreprises Cameroun</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            L&apos;annuaire B2B le plus complet du Cameroun.{' '}
            <strong className="text-foreground">50 000+ sociétés vérifiées</strong> à Douala, Yaoundé et dans
            toute la CEMAC. Filtrez par ville et secteur, accédez aux contacts des
            dirigeants et exportez vos listes de prospection.
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="p-3">
                <dt className="font-heading text-2xl font-bold text-[#1B7A3E]">{stat.value}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-5 py-12 pb-20 space-y-16">
        {/* Régions Grid */}
        <section>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-2">
            📍 Parcourir par Région / Ville
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {regions.map((region) => (
              <Link
                key={region.slug}
                href={`/annuaire/${region.slug}`}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-[#1B7A3E]/40 hover:shadow-md"
              >
                <span className="font-heading text-base font-semibold text-foreground group-hover:text-[#1B7A3E] transition-colors">
                  {region.name}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  {region.count} entreprises
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Secteurs Grid */}
        <section>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-2">
            🏢 Parcourir par Secteur d&apos;Activité
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {secteurs.map((secteur) => (
              <Link
                key={secteur.slug}
                href={`/annuaire/${secteur.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-[#1B7A3E]/40 hover:shadow-md"
              >
                <span className="text-3xl">{secteur.icon}</span>
                <span className="font-heading text-sm font-semibold text-foreground group-hover:text-[#1B7A3E] transition-colors">
                  {secteur.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Bloc SEO textuel */}
        <section className="rounded-2xl border border-border bg-secondary/30 p-8 sm:p-10 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-heading text-2xl font-bold text-foreground">
            La base de données d&apos;entreprises camerounaises de référence
          </h2>
          <p>
            Trouver une{' '}
            <strong className="text-foreground">base de données d&apos;entreprises au Cameroun</strong> fiable et
            à jour est le premier défi de tout commercial ou directeur des ventes.
            Sales Companion 2.0 a été conçu pour y répondre : notre annuaire B2B
            centralise plus de{' '}
            <strong className="text-[#1B7A3E]">50 000 entreprises camerounaises</strong>{' '}
            vérifiées à partir des sources officielles (RCCM, Direction Générale
            des Impôts).
          </p>
          <p>
            Contrairement aux fichiers Excel vendus sous le manteau ou aux
            annuaires PDF obsolètes, notre base de données est{' '}
            <strong className="text-foreground">mise à jour en continu</strong>. Chaque fiche entreprise inclut
            le numéro RCCM, le NIU (Numéro d&apos;Identifiant Unique), le secteur
            d&apos;activité, la localisation et — pour les abonnés — les contacts
            directs des dirigeants.
          </p>
          <p>
            Que vous cherchiez une{' '}
            <strong className="text-foreground">liste d&apos;entreprises à Douala</strong>, un annuaire des
            sociétés de Yaoundé, ou une vue complète d&apos;un secteur précis comme le
            BTP, la finance ou la logistique, cet annuaire est votre point de
            départ pour une prospection B2B efficace au Cameroun.
          </p>
        </section>

        {/* FAQ Section */}
        <section>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-6">
            ❓ Questions fréquentes sur notre base de données
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-border bg-card p-5 [&_summary::-webkit-details-marker]:hidden"
                open={i === 0}
              >
                <summary className="flex cursor-pointer items-center justify-between font-heading text-base font-semibold text-foreground">
                  {item.question}
                  <span className="ml-2 transition-transform group-open:rotate-180 text-muted-foreground">
                    ↓
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground border-t border-border pt-3">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#135A2E] via-[#1B7A3E] to-[#0D3B1E] px-8 py-14 text-center shadow-xl">
          <h3 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Accédez à la base de données complète
          </h3>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-emerald-100">
            Inscrivez-vous gratuitement pour accéder aux contacts des dirigeants,
            exporter vos listes de prospection B2B et gérer votre pipeline
            directement dans le CRM intégré.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#1B7A3E] shadow-md transition-all hover:bg-emerald-50 hover:shadow-lg hover:scale-[1.02]"
          >
            Créer mon compte gratuit →
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
