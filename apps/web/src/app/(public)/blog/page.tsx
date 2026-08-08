import Link from 'next/link'
import { Metadata } from 'next'
import { PublicNav } from '@/components/landing/PublicNav'
import { PublicFooter } from '@/components/landing/PublicFooter'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://salescompanion2-0.com'

export const metadata: Metadata = {
  title: 'Blog — Prospection B2B & CRM au Cameroun | Sales Companion 2.0',
  description:
    'Conseils, guides et stratégies pour les commerciaux et managers au Cameroun. Prospection B2B, utilisation des données entreprises, CRM et développement des ventes.',
  alternates: { canonical: `${baseUrl}/blog` },
  openGraph: {
    title: 'Blog Sales Companion 2.0 — Conseils B2B Cameroun',
    description:
      'Guides pratiques pour booster votre prospection commerciale au Cameroun.',
    url: `${baseUrl}/blog`,
    siteName: 'Sales Companion 2.0',
    type: 'website'
  }
}

const ARTICLES = [
  {
    slug: 'base-de-donnees-entreprises-cameroun-2026',
    title: "Où trouver une base de données d'entreprises fiable au Cameroun en 2026 ?",
    excerpt:
      "Fichiers obsolètes, données incomplètes... L'accès à une liste d'entreprises fiable est le principal défi des commerciaux au Cameroun. Découvrez les sources officielles et la nouvelle alternative digitale incontournable.",
    category: 'Guide',
    date: '16 juin 2026',
    readTime: '8 min',
    emoji: '🗂️',
    featured: true
  },
  {
    slug: 'trouver-clients-b2b-cameroun-2026',
    title: 'Comment trouver des clients B2B au Cameroun en 2026 : guide complet',
    excerpt:
      "Secteurs porteurs, méthodes terrain, réseaux et outils digitaux : le guide définitif pour identifier, contacter et convertir des prospects B2B à Douala, Yaoundé et dans tout le Cameroun.",
    category: 'Prospection',
    date: '14 juin 2026',
    readTime: '12 min',
    emoji: '🎯',
    featured: false
  },
  {
    slug: 'annuaire-entreprises-btp-douala',
    title: 'Annuaire des entreprises BTP à Douala : le guide complet 2026',
    excerpt:
      'Le secteur du Bâtiment et Travaux Publics à Douala compte plus de 4 200 entreprises actives. Ce guide vous donne les clés pour identifier les bons interlocuteurs.',
    category: 'Annuaire',
    date: '11 juin 2026',
    readTime: '6 min',
    emoji: '🏗️',
    featured: false
  },
  {
    slug: 'niu-rccm-identifier-entreprise-camerounaise',
    title: 'NIU et RCCM : comment identifier une entreprise camerounaise',
    excerpt:
      "Comprendre le NIU et le RCCM est essentiel pour tout commercial B2B. Ce guide vous explique comment les utiliser pour vérifier et qualifier vos prospects.",
    category: 'Guide',
    date: '11 juin 2026',
    readTime: '5 min',
    emoji: '📋',
    featured: false
  },
  {
    slug: 'prospection-commerciale-cameroun-methodes-outils',
    title: 'Prospection commerciale terrain au Cameroun : méthodes et outils',
    excerpt:
      "Le terrain reste le principal canal de vente au Cameroun. Comment combiner la prospection physique avec les outils numériques pour maximiser votre taux de conversion ?",
    category: 'Stratégie',
    date: '11 juin 2026',
    readTime: '7 min',
    emoji: '🗺️',
    featured: false
  },
  {
    slug: 'crm-commerciaux-cameroun-comparatif-2026',
    title: 'CRM pour commerciaux au Cameroun : comparatif 2026',
    excerpt:
      "Salesforce, HubSpot, ou une solution locale adaptée au marché camerounais ? Ce comparatif honnête vous aide à choisir le bon outil CRM selon votre taille d'équipe et votre budget.",
    category: 'Outils',
    date: '11 juin 2026',
    readTime: '9 min',
    emoji: '⚙️',
    featured: false
  },
  {
    slug: 'secteurs-actifs-douala-2026',
    title: "Les 10 secteurs d'activité les plus actifs à Douala en 2026",
    excerpt:
      "Douala concentre 60% du tissu économique camerounais. Quels secteurs affichent la plus forte croissance ? Commerce, BTP, Tech, Finance, Agroalimentaire.",
    category: 'Marché',
    date: '11 juin 2026',
    readTime: '6 min',
    emoji: '📊',
    featured: false
  },
  {
    slug: 'top-10-secteurs-prospecter-douala-2026',
    title: 'Top 10 secteurs à prospecter à Douala en 2026',
    excerpt:
      "Pour chacun des 10 secteurs clés de Douala : pourquoi il est prioritaire, les opportunités B2B concrètes, les acteurs clés à cibler et la stratégie d'approche.",
    category: 'Marché',
    date: '14 juin 2026',
    readTime: '10 min',
    emoji: '🏙️',
    featured: false
  },
  {
    slug: 'annuaire-entreprises-douala-par-quartier',
    title: 'Annuaire entreprises Douala par quartier : Bonanjo, Akwa, Bali et plus',
    excerpt:
      "Guide complet des entreprises de Douala organisé par quartier. Trouvez les sociétés, secteurs d'activité et zones d'affaires de Bonanjo, Akwa, Bali, Bonapriso, Bassa et Bonabéri.",
    category: 'Annuaire',
    date: '14 juin 2026',
    readTime: '9 min',
    emoji: '🗺️',
    featured: false
  },
  {
    slug: 'prospection-terrain-vs-digital-cameroun',
    title: 'Prospection terrain vs digital au Cameroun : ce qui marche vraiment en 2026',
    excerpt:
      "Comparatif complet entre prospection terrain et prospection digitale pour les commerciaux B2B au Cameroun. Stratégie hybride gagnante pour Douala et Yaoundé.",
    category: 'Stratégie',
    date: '15 juin 2026',
    readTime: '8 min',
    emoji: '⚖️',
    featured: false
  },
  {
    slug: 'liste-entreprises-cameroun-secteur-btp',
    title: 'Liste des entreprises du BTP au Cameroun en 2026 : acteurs, opportunités et contacts',
    excerpt:
      "Liste complète des entreprises du BTP au Cameroun en 2026 : groupes internationaux, PME locales, promoteurs immobiliers et sous-traitants à Douala et Yaoundé.",
    category: 'Annuaire',
    date: '15 juin 2026',
    readTime: '10 min',
    emoji: '🚧',
    featured: false
  }
]

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Prospection: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Annuaire:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'    },
  Guide:       { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
  Stratégie:   { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200'  },
  Outils:      { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200'    },
  Marché:      { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'     }
}

function CategoryBadge({ category }: { category: string }) {
  const s = CATEGORY_STYLES[category] ?? {
    bg: 'bg-secondary',
    text: 'text-muted-foreground',
    border: 'border-border'
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.bg} ${s.text} ${s.border}`}
    >
      {category}
    </span>
  )
}

export default function BlogPage() {
  const featured = ARTICLES.find((a) => a.featured)
  const rest = ARTICLES.filter((a) => !a.featured)

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <PublicNav activePage="blog" />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-card/30 py-16 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,#1B7A3E_8%,transparent),transparent)]"
        />
        <div className="mx-auto max-w-3xl px-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#1B7A3E] animate-pulse" />
            Ressources &amp; Conseils B2B
          </span>
          <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Le Blog <span className="text-[#1B7A3E]">Sales Companion</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Stratégies, guides et outils pour les commerciaux et managers qui veulent développer
            leur activité B2B au Cameroun.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-5 py-12 pb-20">
        {/* Article à la une */}
        {featured && (
          <Link href={`/blog/${featured.slug}`} className="group mb-10 block">
            <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:border-[#1B7A3E]/40 hover:shadow-md md:p-10">
              {/* Glow subtil */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,#1B7A3E_10%,transparent),transparent_70%)]"
              />
              <div className="relative flex flex-wrap items-center gap-3 mb-5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  ⭐ Article à la une
                </span>
                <span className="text-xs text-muted-foreground">
                  {featured.date} · {featured.readTime} de lecture
                </span>
              </div>
              <div className="text-4xl mb-4">{featured.emoji}</div>
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground text-balance mb-4 group-hover:text-[#1B7A3E] transition-colors sm:text-3xl">
                {featured.title}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground mb-6">
                {featured.excerpt}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all group-hover:bg-primary/90">
                Lire l'article →
              </span>
            </article>
          </Link>
        )}

        {/* Grille articles */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => (
            <Link key={article.slug} href={`/blog/${article.slug}`} className="group block">
              <article className="flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:border-[#1B7A3E]/40 hover:shadow-md">
                <div className="text-3xl mb-3">{article.emoji}</div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <CategoryBadge category={article.category} />
                  <span className="text-[11px] text-muted-foreground">{article.readTime}</span>
                </div>
                <h2 className="font-heading text-[15px] font-semibold leading-snug tracking-tight text-foreground mb-3 group-hover:text-[#1B7A3E] transition-colors flex-1">
                  {article.title}
                </h2>
                <p className="text-xs leading-relaxed text-muted-foreground mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                <span className="text-xs font-semibold text-[#1B7A3E] group-hover:underline">
                  Lire l'article →
                </span>
              </article>
            </Link>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 overflow-hidden rounded-3xl bg-gradient-to-br from-[#135A2E] via-[#1B7A3E] to-[#0D3B1E] px-8 py-14 text-center shadow-xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_60%)]"
          />
          <h3 className="relative font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Passez à l'action
          </h3>
          <p className="relative mx-auto mt-4 max-w-lg text-sm leading-relaxed text-emerald-100">
            Accédez à la base de données de plus de{' '}
            <strong className="text-white">50 000 entreprises camerounaises</strong>{' '}
            avec contacts des dirigeants, numéros RCCM et NIU.
          </p>
          <Link
            href="/register"
            className="relative mt-8 inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#1B7A3E] shadow-md transition-all hover:bg-emerald-50 hover:shadow-lg hover:scale-[1.02]"
          >
            Créer un compte gratuit →
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
