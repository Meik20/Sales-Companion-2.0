import { Metadata } from 'next'
import Link from 'next/link'
import { ScIcon } from '@/components/ui/ScIcon'
import '@/features/landing/styles/landing.css' // Import des styles de la landing page

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
  alternates: { canonical: 'https://salescompanion2-0.com/annuaire' },
  openGraph: {
    title: 'Base de Données Entreprises Cameroun — Annuaire B2B 50 000+ Sociétés',
    description:
      '50 000+ entreprises camerounaises vérifiées. Filtrez par ville et secteur. La référence pour la prospection B2B au Cameroun.',
    url: 'https://salescompanion2-0.com/annuaire',
    siteName: 'Sales Companion 2.0',
    type: 'website'
  }
}

const FAQ_ITEMS = [
  {
    question: 'Qu\'existe-t-il comme base de données d\'entreprises au Cameroun ?',
    answer:
      'Sales Companion 2.0 est la base de données d\'entreprises camerounaises la plus complète disponible en ligne. Elle recense plus de 50 000 sociétés vérifiées à Douala, Yaoundé, Bafoussam, Garoua et Bamenda, avec leurs informations légales (RCCM, NIU), contacts de dirigeants et secteurs d\'activité.'
  },
  {
    question: 'Comment trouver la liste des entreprises à Douala ?',
    answer:
      'Via l\'annuaire Sales Companion 2.0, vous pouvez filtrer les entreprises de Douala par quartier (Bonanjo, Akwa, Bali, Bassa, Bonabéri) et par secteur (BTP, commerce, tech, finance). Plus de 15 000 entreprises de Douala sont référencées.'
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
    question: 'L\'accès à la base de données est-il gratuit ?',
    answer:
      'Une version d\'essai gratuite est disponible pour découvrir la plateforme. L\'accès complet (export, contacts dirigeants, filtres avancés) nécessite un abonnement. Les tarifs sont disponibles en XAF, adaptés au marché camerounais.'
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
      'Base de données de plus de 50 000 entreprises camerounaises vérifiées, incluant leurs informations légales (RCCM, NIU), contacts et secteurs d\'activité.',
    url: 'https://salescompanion2-0.com/annuaire',
    creator: {
      '@type': 'Organization',
      name: 'Sales Companion 2.0',
      url: 'https://salescompanion2-0.com'
    },
    spatialCoverage: 'Cameroun',
    temporalCoverage: '2026',
    license: 'https://salescompanion2-0.com/terms',
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
      {/* Navbar identique à la landing page */}
      <nav className="nav" style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--bd)', backgroundColor: 'var(--bg)' }}>
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
                <Link href="/login">CRM</Link>
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
      <section className="hero" style={{ paddingBottom: '40px', paddingTop: '60px' }}>
        <div className="hero-glow-tl" aria-hidden="true"></div>
        <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '20px' }}>
          Base de Données <em>Entreprises Cameroun</em>
        </h1>
        <p className="hero-sub" style={{ maxWidth: '700px', margin: '0 auto', fontSize: '1.1rem' }}>
          L'annuaire B2B le plus complet du Cameroun.{' '}
          <strong style={{ color: 'var(--tx)' }}>50 000+ sociétés vérifiées</strong> à Douala,
          Yaoundé et dans toute la CEMAC. Filtrez par ville et secteur, accédez aux contacts des
          dirigeants et exportez vos listes de prospection.
        </p>
        {/* Statistiques clés — signal de confiance pour Google */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            flexWrap: 'wrap',
            marginTop: '32px'
          }}
        >
          {[
            { value: '50 000+', label: 'Entreprises indexées' },
            { value: '6', label: 'Secteurs couverts' },
            { value: '5', label: 'Villes disponibles' },
            { value: 'RCCM/NIU', label: 'Données vérifiées' }
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: 'var(--gm)',
                  fontFamily: "'Syne', sans-serif"
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--tx3)', marginTop: '4px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px 80px' }}>
        
        {/* Regions Grid */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📍 Parcourir par Région / Ville
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: '16px' 
          }}>
            {regions.map((region) => (
              <Link
                key={region.slug}
                href={`/annuaire/${region.slug}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid var(--bd)',
                  backgroundColor: 'var(--dark2)',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.2rem', fontWeight: '500', color: 'var(--tx)' }}>
                  {region.name}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--tx3)', marginTop: '8px' }}>
                  {region.count} entreprises
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Secteurs Grid */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏢 Parcourir par Secteur d'Activité
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: '16px' 
          }}>
            {secteurs.map((secteur) => (
              <Link
                key={secteur.slug}
                href={`/annuaire/${secteur.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--bd)',
                  backgroundColor: 'var(--dark2)',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ 
                  fontSize: '1.8rem', 
                  backgroundColor: 'var(--dark3)', 
                  padding: '12px', 
                  borderRadius: '8px',
                  border: '1px solid var(--bd)'
                }}>
                  {secteur.icon}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--tx)' }}>
                  {secteur.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Bloc SEO textuel — contenu dense pour l'indexation */}
        <div
          style={{
            marginBottom: '60px',
            padding: '40px',
            background: 'var(--dark2)',
            border: '1px solid var(--bd)',
            borderRadius: '16px'
          }}
        >
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', color: 'var(--tx)' }}>
            La base de données d'entreprises camerounaises de référence
          </h2>
          <div style={{ color: 'var(--tx2)', lineHeight: '1.8', fontSize: '0.95rem' }}>
            <p style={{ marginBottom: '16px' }}>
              Trouver une <strong style={{ color: 'var(--tx)' }}>base de données d'entreprises au Cameroun</strong> fiable et à jour est le premier défi de tout commercial ou directeur des ventes. Sales Companion 2.0 a été conçu pour y répondre : notre annuaire B2B centralise plus de{' '}
              <strong style={{ color: 'var(--gm)' }}>50 000 entreprises camerounaises</strong> vérifiées à partir des sources officielles (RCCM, Direction Générale des Impôts).
            </p>
            <p style={{ marginBottom: '16px' }}>
              Contrairement aux fichiers Excel vendus sous le manteau ou aux annuaires PDF obsolètes, notre base de données est <strong style={{ color: 'var(--tx)' }}>mise à jour en continu</strong>. Chaque fiche entreprise inclut le numéro RCCM, le NIU (Numéro d'Identifiant Unique), le secteur d'activité, la localisation et — pour les abonnés — les contacts directs des dirigeants.
            </p>
            <p>
              Que vous cherchiez une <strong style={{ color: 'var(--tx)' }}>liste d'entreprises à Douala</strong>, un annuaire des sociétés de Yaoundé, ou une vue complète d'un secteur précis comme le BTP, la finance ou la logistique, cet annuaire est votre point de départ pour une prospection B2B efficace au Cameroun.
            </p>
          </div>
        </div>

        {/* FAQ Section — visible pour les utilisateurs ET pour Google */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ❓ Questions fréquentes sur notre base de données
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '24px',
                  background: 'var(--dark2)',
                  border: '1px solid var(--bd)',
                  borderRadius: '12px'
                }}
              >
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: 'var(--tx)',
                    marginBottom: '12px',
                    lineHeight: '1.4'
                  }}
                >
                  {item.question}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--tx2)', lineHeight: '1.7', margin: 0 }}>
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div style={{
          padding: '48px 32px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--dark3), var(--bg))',
          border: '1px solid rgba(27, 122, 62, 0.3)',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Accédez à la base de données complète</h3>
          <p style={{ color: 'var(--tx2)', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px', lineHeight: '1.6' }}>
            Inscrivez-vous gratuitement pour accéder aux contacts des dirigeants, exporter vos
            listes de prospection B2B et gérer votre pipeline directement dans le CRM intégré.
          </p>
          <Link href="/register" className="btn btn-primary btn-xl">
            Créer mon compte gratuit
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="footer" style={{ borderTop: '1px solid var(--bd)' }}>
        <div className="footer-inner" style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: 'var(--tx3)', fontSize: '0.9rem' }}>
            &copy; {new Date().getFullYear()} Sales Companion 2.0 · Base de données entreprises Cameroun · Annuaire B2B
          </p>
          <nav
            aria-label="Liens internes"
            style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}
          >
            <Link href="/" style={{ color: 'var(--tx3)', fontSize: '0.85rem', textDecoration: 'none' }}>Accueil</Link>
            <Link href="/blog" style={{ color: 'var(--tx3)', fontSize: '0.85rem', textDecoration: 'none' }}>Blog B2B</Link>
            <Link href="/blog/base-de-donnees-entreprises-cameroun-2026" style={{ color: 'var(--tx3)', fontSize: '0.85rem', textDecoration: 'none' }}>Guide base de données</Link>
            <Link href="/register" style={{ color: 'var(--tx3)', fontSize: '0.85rem', textDecoration: 'none' }}>Essai gratuit</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
