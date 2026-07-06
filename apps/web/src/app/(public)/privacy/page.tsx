import Link from 'next/link'
import { Metadata } from 'next'
import { ScIcon } from '@/components/ui/ScIcon'
import '@/features/landing/styles/landing.css'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://salescompanion2-0.com'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité | Sales Companion 2.0',
  description:
    "Politique de confidentialité de Sales Companion 2.0 : collecte, traitement et protection de vos données personnelles conformément à la réglementation en vigueur au Cameroun.",
  alternates: { canonical: `${baseUrl}/privacy` },
  openGraph: {
    title: 'Politique de Confidentialité — Sales Companion 2.0',
    description: 'Comment Sales Companion 2.0 collecte, utilise et protège vos données personnelles.',
    url: `${baseUrl}/privacy`,
    siteName: 'Sales Companion 2.0',
    type: 'website'
  }
}

const SECTIONS = [
  {
    id: 'responsable',
    title: '1. Responsable du traitement',
    content: `Sales Companion 2.0 est édité par [Société éditrice], dont le siège social est situé à Douala, Cameroun. Pour toute question relative à la protection de vos données, vous pouvez nous contacter à l'adresse : privacy@salescompanion2-0.com.`
  },
  {
    id: 'donnees-collectees',
    title: '2. Données collectées',
    content: `Nous collectons les catégories de données suivantes :`,
    bullets: [
      'Données d\'identification : nom, prénom, adresse e-mail lors de la création de compte.',
      'Données de connexion : adresse IP, type de navigateur, horodatage des connexions.',
      'Données d\'usage : pages visitées, recherches effectuées, prospects consultés, actions dans votre pipeline CRM.',
      'Données de facturation : informations de paiement (traitées de façon sécurisée par notre prestataire de paiement).',
      'Données professionnelles : nom de l\'entreprise, secteur d\'activité, rôle (commercial, manager, membre).'
    ]
  },
  {
    id: 'finalites',
    title: '3. Finalités du traitement',
    content: `Vos données sont traitées pour les finalités suivantes :`,
    bullets: [
      'Fourniture et amélioration des services de la plateforme (annuaire B2B, CRM, IA).',
      'Gestion de votre compte et authentification sécurisée.',
      'Communication relative à votre abonnement (factures, confirmations).',
      'Assistance technique et support client.',
      'Analyses statistiques anonymisées pour améliorer l\'expérience utilisateur.',
      'Respect des obligations légales et réglementaires.'
    ]
  },
  {
    id: 'base-legale',
    title: '4. Base légale du traitement',
    content: `Le traitement de vos données repose sur les bases légales suivantes : l'exécution du contrat (fourniture des services), votre consentement (communications marketing), et nos obligations légales (conservation des données de facturation).`
  },
  {
    id: 'conservation',
    title: '5. Durée de conservation',
    content: `Vos données sont conservées pendant la durée de votre relation contractuelle avec Sales Companion 2.0. En cas de résiliation de compte, vos données personnelles sont supprimées dans un délai de 30 jours, à l'exception des données de facturation conservées pendant 10 ans conformément aux obligations comptables en vigueur.`
  },
  {
    id: 'partage',
    title: '6. Partage des données',
    content: `Nous ne vendons jamais vos données personnelles à des tiers. Vos données peuvent être partagées avec :`,
    bullets: [
      'Google Firebase (hébergement, authentification, base de données) — infrastructure cloud sécurisée.',
      'Notre prestataire de paiement pour le traitement des transactions.',
      'Les autorités compétentes sur demande légale expresse.'
    ]
  },
  {
    id: 'securite',
    title: '7. Sécurité des données',
    content: `Sales Companion 2.0 met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, altération, divulgation ou destruction. Cela inclut le chiffrement des communications (HTTPS/TLS), l'authentification à deux facteurs (2FA), la vérification obligatoire de l'adresse e-mail, et des audits réguliers de nos règles de sécurité Firestore.`
  },
  {
    id: 'droits',
    title: '8. Vos droits',
    content: `Conformément à la réglementation applicable, vous disposez des droits suivants :`,
    bullets: [
      'Droit d\'accès : obtenir une copie de vos données personnelles.',
      'Droit de rectification : corriger des données inexactes ou incomplètes.',
      'Droit à l\'effacement : demander la suppression de vos données ("droit à l\'oubli").',
      'Droit à la portabilité : recevoir vos données dans un format lisible par machine.',
      'Droit d\'opposition : vous opposer à certains traitements (ex. communications marketing).',
      'Droit à la limitation : restreindre le traitement dans certaines circonstances.'
    ]
  },
  {
    id: 'cookies',
    title: '9. Cookies',
    content: `Sales Companion 2.0 utilise des cookies strictement nécessaires au fonctionnement de la plateforme (session d'authentification, préférences de langue et de thème). Aucun cookie de tracking publicitaire tiers n'est utilisé. Vous pouvez gérer les cookies via les paramètres de votre navigateur.`
  },
  {
    id: 'modifications',
    title: '10. Modifications de la politique',
    content: `Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Toute modification significative vous sera notifiée par e-mail ou via un avis visible dans l'application au moins 30 jours avant son entrée en vigueur. La date de dernière mise à jour est indiquée en bas de page.`
  },
  {
    id: 'contact',
    title: '11. Contact & réclamations',
    content: `Pour exercer vos droits ou pour toute question relative à cette politique, contactez notre délégué à la protection des données à l'adresse : privacy@salescompanion2-0.com. Vous avez également le droit d'introduire une réclamation auprès de l'autorité de contrôle compétente.`
  }
]

export default function PrivacyPage() {
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
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/terms">CGU</Link></li>
            </ul>
            <div className="nav-cta">
              <Link href="/login" className="btn btn-ghost btn-sm">Connexion</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Essai Gratuit</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <section
        style={{
          padding: '100px 24px 60px',
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
          Dernière mise à jour : 14 juin 2026
        </span>
        <h1
          className="hero-title"
          style={{ fontSize: 'clamp(32px, 5vw, 56px)', marginBottom: '20px' }}
        >
          🔒 Politique de <em>Confidentialité</em>
        </h1>
        <p
          className="hero-sub"
          style={{ maxWidth: '640px', margin: '0 auto', fontSize: '1rem' }}
        >
          Vos données sont précieuses. Nous vous expliquons de manière transparente comment nous les collectons, les utilisons et les protégeons.
        </p>

        {/* Quick nav */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            marginTop: '36px'
          }}
        >
          {['Données collectées', 'Finalités', 'Vos droits', 'Cookies', 'Contact'].map((label) => (
            <span
              key={label}
              style={{
                padding: '6px 14px',
                background: 'rgba(27,122,62,0.1)',
                border: '1px solid rgba(27,122,62,0.25)',
                borderRadius: '999px',
                fontSize: '12px',
                color: 'var(--gm)',
                fontWeight: 600
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <main
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: '0 24px 100px'
        }}
      >
        {/* Trust banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(27,122,62,0.08), rgba(27,122,62,0.03))',
            border: '1px solid rgba(27,122,62,0.25)',
            borderRadius: '16px',
            padding: '20px 28px',
            marginBottom: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '2rem' }}>🛡️</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--tx)', fontSize: '15px' }}>
              Engagement de Sales Companion 2.0
            </p>
            <p style={{ margin: '4px 0 0', color: 'var(--tx2)', fontSize: '13px', lineHeight: 1.6 }}>
              Nous ne vendons jamais vos données. Vous êtes propriétaire de vos informations et pouvez les supprimer à tout moment depuis vos paramètres de compte.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              style={{
                background: 'var(--dark2)',
                border: '1px solid var(--bd)',
                borderRadius: '16px',
                padding: '28px 32px'
              }}
            >
              <h2
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--tx)',
                  marginBottom: '14px',
                  letterSpacing: '-0.01em'
                }}
              >
                {section.title}
              </h2>
              <p
                style={{
                  color: 'var(--tx2)',
                  lineHeight: 1.8,
                  fontSize: '14px',
                  margin: section.bullets ? '0 0 14px' : 0
                }}
              >
                {section.content}
              </p>
              {section.bullets && (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '0',
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {section.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        color: 'var(--tx2)',
                        fontSize: '14px',
                        lineHeight: 1.7
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--gm)',
                          marginTop: '8px',
                          flexShrink: 0
                        }}
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: '64px',
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
              fontSize: '1.5rem',
              marginBottom: '12px',
              letterSpacing: '-0.02em'
            }}
          >
            Des questions sur vos données ?
          </h3>
          <p style={{ color: 'var(--tx2)', marginBottom: '28px', fontSize: '14px', lineHeight: 1.7 }}>
            Notre équipe est disponible pour répondre à toutes vos questions relatives à la protection de vos données personnelles.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="mailto:privacy@salescompanion2-0.com"
              className="btn btn-primary btn-md"
            >
              ✉️ Contacter le DPO
            </a>
            <Link href="/terms" className="btn btn-outline btn-md">
              Voir les CGU →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="footer"
        style={{ borderTop: '1px solid var(--bd)', padding: '40px 24px', textAlign: 'center' }}
      >
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--tx3)', fontSize: '13px', textDecoration: 'none' }}>Accueil</Link>
          <Link href="/terms" style={{ color: 'var(--tx3)', fontSize: '13px', textDecoration: 'none' }}>CGU</Link>
          <Link href="/blog" style={{ color: 'var(--tx3)', fontSize: '13px', textDecoration: 'none' }}>Blog</Link>
          <Link href="/register" style={{ color: 'var(--gm)', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>Créer un compte</Link>
        </div>
        <p style={{ color: 'var(--tx3)', fontSize: '0.875rem', margin: 0 }}>
          © {new Date().getFullYear()} Sales Companion 2.0 · 🇨🇲 Intelligence B2B Cameroun
        </p>
      </footer>
    </div>
  )
}
