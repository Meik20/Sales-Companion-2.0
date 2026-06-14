import Link from 'next/link'
import { Metadata } from 'next'
import { ScIcon } from '@/components/ui/ScIcon'
import '@/features/landing/styles/landing.css'

export const metadata: Metadata = {
  title: 'Blog — Prospection B2B & CRM au Cameroun | Sales Companion 2.0',
  description:
    'Conseils, guides et stratégies pour les commerciaux et managers au Cameroun. Prospection B2B, utilisation des données entreprises, CRM et développement des ventes.',
  alternates: { canonical: 'https://salescompanion2-0.com/blog' },
  openGraph: {
    title: 'Blog Sales Companion 2.0 — Conseils B2B Cameroun',
    description:
      'Guides pratiques pour booster votre prospection commerciale au Cameroun.',
    url: 'https://salescompanion2-0.com/blog',
    siteName: 'Sales Companion 2.0',
    type: 'website'
  }
}

const ARTICLES = [
  {
    slug: 'trouver-clients-b2b-cameroun-2026',
    title: 'Comment trouver des clients B2B au Cameroun en 2026 : guide complet',
    excerpt:
      "Secteurs porteurs, méthodes terrain, réseaux et outils digitaux : le guide définitif pour identifier, contacter et convertir des prospects B2B à Douala, Yaoundé et dans tout le Cameroun. Avec les 5 erreurs à éviter et un pipeline en 7 étapes.",
    category: 'Prospection',
    date: '14 juin 2026',
    readTime: '12 min',
    emoji: '🎯',
    featured: true
  },
  {
    slug: 'annuaire-entreprises-btp-douala',
    title: 'Annuaire des entreprises BTP à Douala : le guide complet 2026',
    excerpt:
      'Le secteur du Bâtiment et Travaux Publics à Douala compte plus de 4 200 entreprises actives. Ce guide vous donne les clés pour identifier les bons interlocuteurs et décrocher des marchés.',
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
      "Comprendre le NIU (Numéro d'Identification Unique) et le RCCM (Registre du Commerce et du Crédit Mobilier) est essentiel pour tout commercial B2B. Ce guide vous explique comment les utiliser pour vérifier et qualifier vos prospects.",
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
      "Le terrain reste le principal canal de vente au Cameroun. Comment combiner la prospection physique avec les outils numériques pour maximiser votre taux de conversion ? Découvrez les meilleures pratiques des équipes commerciales les plus performantes.",
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
      'Salesforce, HubSpot, ou une solution locale adaptée au marché camerounais ? Ce comparatif honnête vous aide à choisir le bon outil CRM selon votre taille d\'équipe et votre budget.',
    category: 'Outils',
    date: '11 juin 2026',
    readTime: '9 min',
    emoji: '⚙️',
    featured: false
  },
  {
    slug: 'secteurs-actifs-douala-2026',
    title: 'Les 10 secteurs d\'activité les plus actifs à Douala en 2026',
    excerpt:
      'Douala concentre 60% du tissu économique camerounais. Quels secteurs affichent la plus forte croissance ? Commerce, BTP, Tech, Finance, Agroalimentaire : une analyse des opportunités pour les commerciaux B2B.',
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
      'Pour chacun des 10 secteurs clés de Douala : pourquoi il est prioritaire, les opportunités B2B concrètes, les acteurs clés à cibler (SABC, Bolloré, Afriland, DHL…) et la stratégie d’approche recommandée sur le terrain.',
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
      'Guide complet des entreprises de Douala organisé par quartier. Trouvez les sociétés, secteurs d\'activité et zones d\'affaires de Bonanjo, Akwa, Bali, Bonapriso, Bassa et Bonabéri.',
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
      'Comparatif complet entre prospection terrain et prospection digitale pour les commerciaux B2B au Cameroun. Avantages, limites et stratégie hybride gagnante pour Douala et Yaoundé.',
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
      'Liste complète des entreprises du BTP au Cameroun en 2026 : groupes internationaux, PME locales, promoteurs immobiliers et sous-traitants à Douala et Yaoundé. Guide de prospection B2B pour le secteur de la construction.',
    category: 'Annuaire',
    date: '15 juin 2026',
    readTime: '10 min',
    emoji: '🚧',
    featured: false
  }
]

const CATEGORY_COLORS: Record<string, string> = {
  Prospection: 'rgba(46, 160, 90, 0.15)',
  Annuaire: 'rgba(29, 78, 216, 0.15)',
  Guide: 'rgba(245, 166, 35, 0.15)',
  Stratégie: 'rgba(147, 51, 234, 0.15)',
  Outils: 'rgba(0, 137, 123, 0.15)',
  Marché: 'rgba(239, 68, 68, 0.15)'
}
const CATEGORY_TEXT: Record<string, string> = {
  Prospection: '#4ade80',
  Annuaire: '#60a5fa',
  Guide: '#f5a623',
  Stratégie: '#c084fc',
  Outils: '#2dd4bf',
  Marché: '#f87171'
}

export default function BlogPage() {
  const featured = ARTICLES.find((a) => a.featured)
  const rest = ARTICLES.filter((a) => !a.featured)

  return (
    <div className="landing-root">
      {/* Navbar */}
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            <ScIcon size={32} className="sc-icon" />
            <span className="nav-brand-text">
              Sales <em>Companion 2.0</em>
            </span>
          </Link>
          <div className="nav-desktop">
            <ul className="nav-links" role="list">
              <li><Link href="/">Accueil</Link></li>
              <li><Link href="/annuaire">Annuaire B2B</Link></li>
              <li><Link href="/blog" aria-current="page" style={{ color: 'var(--gm)' }}>Blog</Link></li>
            </ul>
            <div className="nav-cta">
              <Link href="/login" className="btn btn-ghost btn-sm">Connexion</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Essai Gratuit</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section
        style={{
          padding: '80px 24px 60px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div className="hero-glow-tl" aria-hidden="true" />
        <span
          className="hero-badge"
          style={{ marginBottom: '24px', display: 'inline-flex' }}
        >
          <span className="hero-badge-dot" />
          Ressources & Conseils B2B
        </span>
        <h1
          className="hero-title"
          style={{ fontSize: 'clamp(36px, 5vw, 60px)', marginBottom: '20px' }}
        >
          Le Blog <em>Sales Companion</em>
        </h1>
        <p
          className="hero-sub"
          style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1rem' }}
        >
          Stratégies, guides et outils pour les commerciaux et managers qui veulent
          développer leur activité B2B au Cameroun.
        </p>
      </section>

      {/* Main Content */}
      <main
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 24px 100px'
        }}
      >
        {/* Featured Article */}
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            style={{ display: 'block', marginBottom: '48px', textDecoration: 'none' }}
          >
            <article
              style={{
                background:
                  'linear-gradient(135deg, var(--dark2) 0%, var(--dark3) 100%)',
                border: '1px solid rgba(46, 160, 90, 0.25)',
                borderRadius: '20px',
                padding: '48px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 300ms, box-shadow 300ms',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-80px',
                  right: '-80px',
                  width: '300px',
                  height: '300px',
                  background:
                    'radial-gradient(circle, rgba(27,122,62,0.12) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(46, 160, 90, 0.15)',
                    color: '#4ade80',
                    border: '1px solid rgba(46,160,90,0.3)',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}
                >
                  ⭐ Article à la une
                </span>
                <span style={{ fontSize: '11px', color: 'var(--tx3)' }}>
                  {featured.date} · {featured.readTime} de lecture
                </span>
              </div>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>{featured.emoji}</div>
              <h2
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 'clamp(22px, 3vw, 32px)',
                  fontWeight: '800',
                  color: 'var(--tx)',
                  marginBottom: '16px',
                  letterSpacing: '-0.02em',
                  lineHeight: '1.2'
                }}
              >
                {featured.title}
              </h2>
              <p style={{ color: 'var(--tx2)', lineHeight: '1.7', maxWidth: '700px', marginBottom: '24px' }}>
                {featured.excerpt}
              </p>
              <span
                className="btn btn-primary btn-md"
                style={{ display: 'inline-flex' }}
              >
                Lire l'article →
              </span>
            </article>
          </Link>
        )}

        {/* Articles Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '20px'
          }}
        >
          {rest.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              style={{ textDecoration: 'none' }}
            >
              <article
                style={{
                  background: 'var(--dark2)',
                  border: '1px solid var(--bd)',
                  borderRadius: '16px',
                  padding: '28px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'border-color 300ms, transform 300ms',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '2rem' }}>{article.emoji}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: CATEGORY_COLORS[article.category] ?? 'rgba(255,255,255,0.05)',
                      color: CATEGORY_TEXT[article.category] ?? 'var(--tx2)',
                      padding: '2px 9px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                  >
                    {article.category}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--tx3)' }}>
                    {article.readTime}
                  </span>
                </div>
                <h2
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: '16px',
                    fontWeight: '700',
                    color: 'var(--tx)',
                    lineHeight: '1.35',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {article.title}
                </h2>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--tx2)',
                    lineHeight: '1.65',
                    flex: 1
                  }}
                >
                  {article.excerpt}
                </p>
                <span style={{ color: 'var(--gm)', fontSize: '13px', fontWeight: '600' }}>
                  Lire l'article →
                </span>
              </article>
            </Link>
          ))}
        </div>

        {/* CTA Section */}
        <div
          style={{
            marginTop: '80px',
            padding: '48px 32px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--dark3), var(--bg))',
            border: '1px solid rgba(27, 122, 62, 0.3)',
            textAlign: 'center'
          }}
        >
          <h3
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '1.8rem',
              marginBottom: '16px',
              letterSpacing: '-0.02em'
            }}
          >
            Passez à l'action
          </h3>
          <p
            style={{
              color: 'var(--tx2)',
              maxWidth: '500px',
              margin: '0 auto 32px',
              lineHeight: '1.65'
            }}
          >
            Accédez à la base de données de plus de{' '}
            <strong style={{ color: 'var(--tx)' }}>50 000 entreprises camerounaises</strong>{' '}
            avec contacts des dirigeants, numéros RCCM et NIU.
          </p>
          <Link href="/register" className="btn btn-primary btn-xl">
            Créer un compte gratuit
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="footer"
        style={{ borderTop: '1px solid var(--bd)', padding: '40px 24px', textAlign: 'center' }}
      >
        <p style={{ color: 'var(--tx3)', fontSize: '0.9rem' }}>
          &copy; {new Date().getFullYear()} Sales Companion 2.0 · Blog B2B Cameroun
        </p>
      </footer>
    </div>
  )
}
