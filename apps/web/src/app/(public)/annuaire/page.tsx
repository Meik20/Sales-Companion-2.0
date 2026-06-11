import { Metadata } from 'next'
import Link from 'next/link'
import { ScIcon } from '@/components/ui/ScIcon'
import '@/features/landing/styles/landing.css' // Import des styles de la landing page

export const metadata: Metadata = {
  title: 'Annuaire B2B des Entreprises au Cameroun',
  description:
    "Parcourez l'annuaire des entreprises camerounaises par région (Douala, Yaoundé...) et par secteur d'activité (BTP, Tech, Finance...). Base de données RCCM/NIU vérifiée.",
}

export default function AnnuaireHub() {
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
        <h1 className="hero-title" style={{ fontSize: '3rem', marginBottom: '20px' }}>
          L'Annuaire B2B <br /> <em>Camerounais</em>
        </h1>
        <p className="hero-sub" style={{ maxWidth: '700px', margin: '0 auto', fontSize: '1.1rem' }}>
          Trouvez vos futurs clients et partenaires. Parcourez notre base de données officielle de
          plus de 50 000 entreprises camerounaises par région et par secteur d'activité.
        </p>
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

        {/* CTA Section */}
        <div style={{
          padding: '48px 32px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--dark3), var(--bg))',
          border: '1px solid rgba(27, 122, 62, 0.3)',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Accès complet à la base de données</h3>
          <p style={{ color: 'var(--tx2)', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px', lineHeight: '1.6' }}>
            Inscrivez-vous gratuitement pour accéder aux contacts des dirigeants, exporter vos
            listes de prospection et gérer votre pipeline directement dans le CRM intégré.
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
            &copy; {new Date().getFullYear()} Sales Companion 2.0. Base de données des entreprises au Cameroun.
          </p>
        </div>
      </footer>
    </div>
  )
}
