import { Metadata } from 'next'
import Link from 'next/link'
import { ScIcon } from '@/components/ui/ScIcon'
import '@/features/landing/styles/landing.css' // Import des styles de la landing page

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
  // FAQ Schema JSON-LD pour la Position Zéro Google
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

  // Dataset Schema pour signaler une base de données à Google
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
    <div className="landing-root">
      {/* FAQ & Dataset Schema JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />

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

      {/* Hero Section */}
      <section className="hero hero-compact">
        <div className="hero-glow-tl" aria-hidden="true"></div>
        <h1 className="hero-title">
          Base de Données <em>Entreprises Cameroun</em>
        </h1>
        <p className="hero-sub">
          L'annuaire B2B le plus complet du Cameroun.{' '}
          <strong>50 000+ sociétés vérifiées</strong> à Douala, Yaoundé et dans
          toute la CEMAC. Filtrez par ville et secteur, accédez aux contacts des
          dirigeants et exportez vos listes de prospection.
        </p>

        {/* Statistiques clés — signal de confiance pour Google */}
        <div className="hero-stats">
          {STATS.map((stat) => (
            <div key={stat.label} className="hero-stat">
              <div className="hero-stat-value">{stat.value}</div>
              <div className="hero-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <main className="container" style={{ paddingBottom: '80px' }}>

        {/* Régions Grid */}
        <div style={{ marginBottom: '60px' }}>
          <h2 className="annuaire-section-title">📍 Parcourir par Région / Ville</h2>
          <div className="annuaire-grid-cities">
            {regions.map((region) => (
              <Link
                key={region.slug}
                href={`/annuaire/${region.slug}`}
                className="annuaire-card annuaire-card-city"
              >
                <span className="annuaire-card-title">{region.name}</span>
                <span className="annuaire-card-count">{region.count} entreprises</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Secteurs Grid */}
        <div style={{ marginBottom: '80px' }}>
          <h2 className="annuaire-section-title">🏢 Parcourir par Secteur d'Activité</h2>
          <div className="annuaire-grid-sectors">
            {secteurs.map((secteur) => (
              <Link
                key={secteur.slug}
                href={`/annuaire/${secteur.slug}`}
                className="annuaire-card annuaire-card-sector"
              >
                <span className="annuaire-card-icon">{secteur.icon}</span>
                <span className="annuaire-card-title">{secteur.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Bloc SEO textuel — contenu dense pour l'indexation */}
        <div className="seo-block">
          <h2>La base de données d'entreprises camerounaises de référence</h2>
          <p>
            Trouver une{' '}
            <strong>base de données d'entreprises au Cameroun</strong> fiable et
            à jour est le premier défi de tout commercial ou directeur des ventes.
            Sales Companion 2.0 a été conçu pour y répondre : notre annuaire B2B
            centralise plus de{' '}
            <strong style={{ color: 'var(--gm)' }}>50 000 entreprises camerounaises</strong>{' '}
            vérifiées à partir des sources officielles (RCCM, Direction Générale
            des Impôts).
          </p>
          <p>
            Contrairement aux fichiers Excel vendus sous le manteau ou aux
            annuaires PDF obsolètes, notre base de données est{' '}
            <strong>mise à jour en continu</strong>. Chaque fiche entreprise inclut
            le numéro RCCM, le NIU (Numéro d'Identifiant Unique), le secteur
            d'activité, la localisation et — pour les abonnés — les contacts
            directs des dirigeants.
          </p>
          <p>
            Que vous cherchiez une{' '}
            <strong>liste d'entreprises à Douala</strong>, un annuaire des
            sociétés de Yaoundé, ou une vue complète d'un secteur précis comme le
            BTP, la finance ou la logistique, cet annuaire est votre point de
            départ pour une prospection B2B efficace au Cameroun.
          </p>
        </div>

        {/* FAQ Section — visible pour les utilisateurs ET pour Google */}
        <div style={{ marginBottom: '60px' }}>
          <h2 className="annuaire-section-title">❓ Questions fréquentes sur notre base de données</h2>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="faq-item">
                <h3 className="faq-question">{item.question}</h3>
                <p className="faq-answer">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="cta-section">
          <div className="cta-glow" aria-hidden="true"></div>
          <h3 className="cta-title">Accédez à la base de données complète</h3>
          <p className="cta-sub">
            Inscrivez-vous gratuitement pour accéder aux contacts des dirigeants,
            exporter vos listes de prospection B2B et gérer votre pipeline
            directement dans le CRM intégré.
          </p>
          <Link href="/register" className="btn btn-primary btn-xl">
            Créer mon compte gratuit
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-bottom">
            <p>
              &copy; {new Date().getFullYear()} Sales Companion 2.0 · Base de
              données entreprises Cameroun · Annuaire B2B
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
                  <Link href="/blog" className="footer-link">
                    Blog B2B
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog/base-de-donnees-entreprises-cameroun-2026"
                    className="footer-link"
                  >
                    Guide base de données
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
