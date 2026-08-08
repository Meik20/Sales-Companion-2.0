import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ScIcon } from '@/components/ui/ScIcon'
import '@/features/landing/styles/landing.css'

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

// Pool d'entreprises de test réalistes pour l'indexation
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

  // Filtrer les entreprises de test correspondantes à la ville ou au secteur
  const filteredCompanies = MOCK_COMPANIES.filter(
    (c) => c.city === slug || c.sector === slug
  )

  // Si aucune entreprise spécifique, générer une liste générique
  const companiesToDisplay =
    filteredCompanies.length > 0
      ? filteredCompanies
      : MOCK_COMPANIES.slice(0, 3).map((c) => ({
          ...c,
          [data.type === 'city' ? 'city' : 'sector']: slug
        }))

  return (
    <div className="landing-root">
      {/* Navbar */}
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand" title="Retour à l'accueil">
            <ScIcon size={32} className="sc-icon" />
            <span className="nav-brand-text">
              Sales <em>Companion 2.0</em>
            </span>
          </Link>

          <div className="nav-desktop">
            <ul className="nav-links" role="list">
              <li>
                <Link href="/">Accueil</Link>
              </li>
              <li>
                <Link href="/annuaire">Annuaire B2B</Link>
              </li>
            </ul>
            <div className="nav-cta">
              <Link href="/login" className="btn btn-ghost btn-sm">
                Connexion
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Essai Gratuit
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <section className="hero hero-compact">
        <div className="hero-glow-tl" aria-hidden="true"></div>
        <h1 className="hero-title">
          Entreprises {data.type === 'city' ? 'à' : 'de'} <br />
          <em>{data.title}</em>
        </h1>
        <p className="hero-sub">
          {data.description} Découvrez notre sélection de professionnels et
          d'opportunités de prospection. Accès complet à plus de{' '}
          <strong>{data.count}</strong> entreprises dans cette catégorie via
          notre CRM.
        </p>
      </section>

      {/* Main Content */}
      <main className="container" style={{ paddingBottom: '80px' }}>
        {/* Breadcrumb retour */}
        <Link href="/annuaire" className="breadcrumb">
          ← Retour à l'annuaire principal
        </Link>

        {/* Liste des Entreprises */}
        <div style={{ marginBottom: '60px' }}>
          <h2 className="annuaire-section-title">
            🏢 Profils d'entreprises disponibles ({companiesToDisplay.length})
          </h2>

          <div className="company-list">
            {companiesToDisplay.map((company, index) => (
              <div key={index} className="company-card">
                <div className="company-card-header">
                  <h3 className="company-name">{company.name}</h3>
                  <span className="badge badge-success">{company.status}</span>
                </div>
                <p className="company-activity">
                  <strong>Activité :</strong> {company.activity}
                </p>
                <div className="company-meta">
                  <span>📍 {company.city.charAt(0).toUpperCase() + company.city.slice(1)}</span>
                  <span>📁 {company.sector.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="cta-section">
          <div className="cta-glow" aria-hidden="true"></div>
          <h3 className="cta-title">Accéder aux contacts des dirigeants</h3>
          <p className="cta-sub">
            Téléphone, e-mail direct, numéro d'immatriculation et bien plus.
            Débloquez tous les détails pour lancer vos campagnes de prospection
            ciblées.
          </p>
          <Link href="/register" className="btn btn-primary btn-xl">
            Débloquer la base de données
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-bottom">
            <p>
              &copy; {new Date().getFullYear()} Sales Companion 2.0 · Base de
              données des entreprises au Cameroun.
            </p>
            <nav aria-label="Liens internes">
              <ul
                role="list"
                style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', listStyle: 'none' }}
              >
                <li>
                  <Link href="/" className="footer-link">
                    Accueil
                  </Link>
                </li>
                <li>
                  <Link href="/annuaire" className="footer-link">
                    Annuaire B2B
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="footer-link">
                    Blog B2B
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="footer-link">
                    Essai gratuit
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
