import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicNav } from '@/components/landing/PublicNav'
import { PublicFooter } from '@/components/landing/PublicFooter'

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return [
    // Villes
    { slug: 'douala' },
    { slug: 'yaounde' },
    { slug: 'bafoussam' },
    { slug: 'garoua' },
    { slug: 'bamenda' },
    // Secteurs
    { slug: 'btp' },
    { slug: 'tech' },
    { slug: 'finance' },
    { slug: 'logistique' },
    { slug: 'agro' },
    { slug: 'commerce' }
  ]
}

const DATA_MAP: Record<
  string,
  { title: string; type: 'city' | 'sector'; description: string; count: string }
> = {
  // Villes
  douala: {
    title: 'Douala',
    type: 'city',
    description: 'Découvrez les entreprises leaders basées à Douala, la capitale économique du Cameroun.',
    count: '15 000+'
  },
  yaounde: {
    title: 'Yaoundé',
    type: 'city',
    description: 'Explorez le tissu économique de Yaoundé, capitale politique et administrative du Cameroun.',
    count: '12 000+'
  },
  bafoussam: {
    title: 'Bafoussam',
    type: 'city',
    description: "Liste des entreprises et commerces actifs à Bafoussam et dans la région de l'Ouest.",
    count: '3 500+'
  },
  garoua: {
    title: 'Garoua',
    type: 'city',
    description: "Parcourez le réseau d'entreprises implantées à Garoua et dans le Nord du pays.",
    count: '2 100+'
  },
  bamenda: {
    title: 'Bamenda',
    type: 'city',
    description: 'Découvrez les acteurs économiques et entreprises locales basés à Bamenda.',
    count: '1 800+'
  },

  // Secteurs
  btp: {
    title: 'Bâtiment & Travaux Publics (BTP)',
    type: 'sector',
    description: 'Entreprises de construction, génie civil et BTP opérant au Cameroun.',
    count: '4 200+'
  },
  tech: {
    title: "Technologies de l'Information (Tech)",
    type: 'sector',
    description: 'Sociétés de services numériques, startups et prestataires IT au Cameroun.',
    count: '1 500+'
  },
  finance: {
    title: 'Banque, Finance & Assurance',
    type: 'sector',
    description: "Établissements bancaires, microfinances et compagnies d'assurance agréés au Cameroun.",
    count: '900+'
  },
  logistique: {
    title: 'Logistique & Transport',
    type: 'sector',
    description: 'Professionnels du fret, du transport de marchandises et de la logistique.',
    count: '2 300+'
  },
  agro: {
    title: 'Agroalimentaire & Agriculture',
    type: 'sector',
    description: 'Producteurs, transformateurs et distributeurs du secteur agro-industriel camerounais.',
    count: '6 000+'
  },
  commerce: {
    title: 'Commerce & Distribution',
    type: 'sector',
    description: 'Import-export, grossistes, grandes surfaces et enseignes de distribution au Cameroun.',
    count: '10 000+'
  }
}

const MOCK_COMPANIES = [
  {
    name: 'Kamer IT Solutions',
    sector: 'tech',
    city: 'douala',
    activity: 'Développement de logiciels & Applications mobiles',
    status: 'Vérifiée RCCM'
  },
  {
    name: 'BTP Cameroun S.A.',
    sector: 'btp',
    city: 'yaounde',
    activity: 'Travaux publics, terrassement et construction de routes',
    status: 'Vérifiée RCCM'
  },
  {
    name: 'Cameroun Agro-Industries',
    sector: 'agro',
    city: 'douala',
    activity: 'Transformation de cacao et café pour exportation',
    status: 'Vérifiée RCCM'
  },
  {
    name: 'Sahel Logistique',
    sector: 'logistique',
    city: 'garoua',
    activity: 'Transport national de marchandises et fret routier',
    status: 'Vérifiée RCCM'
  },
  {
    name: "L'Ouest Finance & Crédit",
    sector: 'finance',
    city: 'bafoussam',
    activity: 'Microfinance de 2ème catégorie et crédits agricoles',
    status: 'Vérifiée RCCM'
  },
  {
    name: 'Digital Africa Agency',
    sector: 'tech',
    city: 'yaounde',
    activity: 'Intégration systèmes, cloud computing et cybersécurité',
    status: 'Vérifiée RCCM'
  },
  {
    name: 'Afrik Distribution',
    sector: 'commerce',
    city: 'douala',
    activity: 'Importation et distribution de biens de grande consommation',
    status: 'Vérifiée RCCM'
  },
  {
    name: 'Génie Civil du Nord',
    sector: 'btp',
    city: 'garoua',
    activity: 'Construction de bâtiments résidentiels et industriels',
    status: 'Vérifiée RCCM'
  }
]

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = DATA_MAP[slug]

  if (!data) {
    return {
      title: 'Annuaire B2B Camerounais',
      description: "Parcourez l'annuaire des entreprises au Cameroun."
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://salescompanion2-0.com'
  const prefix = data.type === 'city' ? 'à' : 'du secteur'
  const titleText = `Entreprises B2B ${prefix} ${data.title} — Annuaire Cameroun`
  const descText = `${data.description} Accédez à plus de ${data.count} profils vérifiés avec contacts des dirigeants.`

  return {
    title: titleText,
    description: descText,
    alternates: {
      canonical: `${baseUrl}/annuaire/${slug}`
    },
    openGraph: {
      title: titleText,
      description: descText,
      url: `${baseUrl}/annuaire/${slug}`,
      type: 'website'
    }
  }
}

export default async function AnnuaireSlugPage({ params }: Props) {
  const { slug } = await params
  const data = DATA_MAP[slug]

  if (!data) {
    notFound()
  }

  const filteredCompanies = MOCK_COMPANIES.filter(
    (c) => c.city === slug || c.sector === slug
  )

  const companiesToDisplay =
    filteredCompanies.length > 0
      ? filteredCompanies
      : MOCK_COMPANIES.slice(0, 3).map((c) => ({
          ...c,
          [data.type === 'city' ? 'city' : 'sector']: slug
        }))

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <PublicNav
        activePage="annuaire"
        backLink={{ href: '/annuaire', label: 'Annuaire principal' }}
      />

      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-border bg-white py-16 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,#1B7A3E_8%,transparent),transparent)]"
        />
        <div className="mx-auto max-w-3xl px-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#1B7A3E] animate-pulse" />
            {data.type === 'city' ? 'Ville' : 'Secteur d\'activité'}
          </span>
          <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Entreprises {data.type === 'city' ? 'à' : 'de'}{' '}
            <span className="text-[#1B7A3E]">{data.title}</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {data.description} Découvrez notre sélection de professionnels et
            d&apos;opportunités de prospection. Accès complet à plus de{' '}
            <strong className="text-foreground">{data.count}</strong> entreprises dans cette catégorie.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-5 py-12 pb-20 space-y-12">
        {/* Breadcrumb retour */}
        <Link
          href="/annuaire"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1B7A3E] transition-colors hover:underline"
        >
          ← Retour à l&apos;annuaire principal
        </Link>

        {/* Liste des Entreprises */}
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-2">
            🏢 Profils d&apos;entreprises disponibles ({companiesToDisplay.length})
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {companiesToDisplay.map((company, index) => (
              <div
                key={index}
                className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:border-[#1B7A3E]/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {company.name}
                  </h3>
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 shrink-0">
                    {company.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4">
                  <strong className="text-foreground">Activité :</strong> {company.activity}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-3">
                  <span>📍 {company.city.charAt(0).toUpperCase() + company.city.slice(1)}</span>
                  <span>📁 {company.sector.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#135A2E] via-[#1B7A3E] to-[#0D3B1E] px-8 py-14 text-center shadow-xl">
          <h3 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Accéder aux contacts des dirigeants
          </h3>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-emerald-100">
            Téléphone, e-mail direct, numéro d&apos;immatriculation et bien plus.
            Débloquez tous les détails pour lancer vos campagnes de prospection
            ciblées.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#1B7A3E] shadow-md transition-all hover:bg-emerald-50 hover:shadow-lg hover:scale-[1.02]"
          >
            Débloquer la base de données →
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
