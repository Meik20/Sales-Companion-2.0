import Link from 'next/link'
import { Metadata } from 'next'
import { ScIcon } from '@/components/ui/ScIcon'
import '@/features/landing/styles/landing.css'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation | Sales Companion 2.0",
  description:
    "Conditions Générales d'Utilisation de Sales Companion 2.0 : droits, obligations, abonnements et règles d'utilisation de la plateforme B2B au Cameroun.",
  alternates: { canonical: 'https://salescompanion2-0.com/terms' },
  openGraph: {
    title: "CGU — Conditions Générales d'Utilisation — Sales Companion 2.0",
    description: "Droits, obligations et règles d'utilisation de la plateforme Sales Companion 2.0.",
    url: 'https://salescompanion2-0.com/terms',
    siteName: 'Sales Companion 2.0',
    type: 'website'
  }
}

const SECTIONS = [
  {
    id: 'objet',
    title: '1. Objet et champ d\'application',
    content: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Sales Companion 2.0, accessible à l'adresse salescompanion2-0.com. En créant un compte ou en utilisant la plateforme, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser la plateforme.`
  },
  {
    id: 'compte',
    title: '2. Création de compte et conditions d\'accès',
    content: `Pour accéder aux services de Sales Companion 2.0, vous devez :`,
    bullets: [
      'Être une personne physique ou morale exerçant une activité commerciale ou professionnelle.',
      'Fournir des informations exactes et à jour lors de l\'inscription.',
      'Vérifier votre adresse e-mail via le lien de confirmation envoyé lors de l\'inscription.',
      'Être âgé d\'au moins 18 ans ou représenter légalement une société.',
      'Maintenir la confidentialité de vos identifiants de connexion.'
    ]
  },
  {
    id: 'services',
    title: '3. Description des services',
    content: `Sales Companion 2.0 propose les services suivants selon votre plan d'abonnement :`,
    bullets: [
      'Annuaire B2B : accès à une base de données d\'entreprises camerounaises vérifiées (RCCM, NIU, contacts).',
      'CRM Pipeline : gestion et suivi de vos prospects commerciaux.',
      'Companion IA : assistant commercial basé sur l\'intelligence artificielle (plans payants).',
      'Gestion d\'équipe : création et management d\'équipes commerciales (plans Manager et Enterprise).',
      'Export de données : téléchargement des résultats en format Excel (plans payants).',
      'Application mobile PWA : accès hors-ligne via Progressive Web App.'
    ]
  },
  {
    id: 'abonnements',
    title: '4. Abonnements et facturation',
    content: `Sales Companion 2.0 propose plusieurs plans tarifaires :`,
    bullets: [
      'Plan Gratuit : accès limité à 10 recherches par jour, sans engagement.',
      'Plan Starter : 50 recherches/jour avec export Excel, facturation mensuelle.',
      'Plan Pro : 200 recherches/jour avec Companion IA, pipeline illimité.',
      'Plan Enterprise : 1 000 recherches/jour avec gestion d\'équipe et support dédié.'
    ],
    extra: 'Les paiements sont effectués via Orange Money, MTN Mobile Money ou virement bancaire. Toute facturation est émise en Francs CFA (XAF). Les abonnements se renouvellent automatiquement sauf résiliation avant la date de renouvellement.'
  },
  {
    id: 'obligations',
    title: '5. Obligations de l\'utilisateur',
    content: `En utilisant Sales Companion 2.0, vous vous engagez à :`,
    bullets: [
      'Utiliser la plateforme uniquement dans un cadre professionnel et légal.',
      'Ne pas extraire massivement les données de l\'annuaire à des fins de revente ou de concurrence.',
      'Ne pas tenter de contourner les mécanismes de sécurité ou de limitation d\'accès.',
      'Ne pas partager vos identifiants de connexion avec des tiers non autorisés.',
      'Respecter la vie privée des contacts présents dans la base de données.',
      'Signaler toute faille de sécurité découverte à security@salescompanion2-0.com.'
    ]
  },
  {
    id: 'propriete',
    title: '6. Propriété intellectuelle',
    content: `L'ensemble du contenu de la plateforme (code source, design, marque, données compilées, algorithmes IA) est la propriété exclusive de Sales Companion 2.0 et est protégé par les lois camerounaises et internationales sur la propriété intellectuelle. Toute reproduction, modification ou exploitation non autorisée est strictement interdite.`
  },
  {
    id: 'donnees-annuaire',
    title: '7. Données de l\'annuaire B2B',
    content: `Les données d'entreprises disponibles dans l'annuaire Sales Companion 2.0 proviennent de sources officielles (RCCM, bases publiques) et sont compilées à des fins professionnelles. L'utilisation de ces données est autorisée exclusivement dans le cadre d'une prospection commerciale légale et éthique. Toute utilisation à des fins de spam, harcèlement ou activité illégale est formellement interdite.`
  },
  {
    id: 'responsabilite',
    title: '8. Limitation de responsabilité',
    content: `Sales Companion 2.0 s'efforce de maintenir l'exactitude et la disponibilité de ses services. Cependant :`,
    bullets: [
      'Nous ne garantissons pas l\'exactitude ou l\'exhaustivité des données de l\'annuaire.',
      'Nous ne sommes pas responsables des interruptions de service dues à des causes extérieures (maintenance, force majeure).',
      'Notre responsabilité est limitée au montant des sommes effectivement payées au titre de votre abonnement.',
      'Nous déclinons toute responsabilité pour les pertes commerciales résultant de l\'utilisation des données.'
    ]
  },
  {
    id: 'resiliation',
    title: '9. Résiliation et suppression de compte',
    content: `Vous pouvez résilier votre abonnement et demander la suppression de votre compte à tout moment depuis la page Paramètres de votre espace, ou en envoyant une demande à support@salescompanion2-0.com. Sales Companion 2.0 se réserve le droit de suspendre ou supprimer tout compte ne respectant pas les présentes CGU, sans préavis ni remboursement.`
  },
  {
    id: 'droit-applicable',
    title: '10. Droit applicable et juridiction',
    content: `Les présentes CGU sont soumises au droit camerounais. Tout litige relatif à leur interprétation ou à leur exécution relève de la compétence exclusive des tribunaux de Douala, Cameroun. En cas de litige, nous nous engageons à tenter une résolution amiable avant toute procédure judiciaire.`
  },
  {
    id: 'modifications-cgu',
    title: '11. Modifications des CGU',
    content: `Sales Companion 2.0 se réserve le droit de modifier les présentes CGU à tout moment. Toute modification substantielle sera notifiée par e-mail au moins 30 jours avant son entrée en vigueur. La poursuite de l'utilisation de la plateforme après cette date vaut acceptation des nouvelles conditions.`
  }
]

export default function TermsPage() {
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
              <li><Link href="/privacy">Confidentialité</Link></li>
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
          📋 Conditions Générales <em>d&apos;Utilisation</em>
        </h1>
        <p
          className="hero-sub"
          style={{ maxWidth: '640px', margin: '0 auto', fontSize: '1rem' }}
        >
          Lisez attentivement les présentes conditions qui régissent votre utilisation de la plateforme Sales Companion 2.0.
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
          {['Compte', 'Services', 'Abonnements', 'Obligations', 'Résiliation', 'Droit applicable'].map((label) => (
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
        {/* Info banner */}
        <div
          style={{
            background: 'rgba(245, 166, 35, 0.06)',
            border: '1px solid rgba(245, 166, 35, 0.25)',
            borderRadius: '16px',
            padding: '20px 28px',
            marginBottom: '48px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '2rem' }}>⚖️</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--tx)', fontSize: '15px' }}>
              Accord contractuel
            </p>
            <p style={{ margin: '4px 0 0', color: 'var(--tx2)', fontSize: '13px', lineHeight: 1.6 }}>
              En créant un compte sur Sales Companion 2.0, vous acceptez les présentes Conditions Générales d&apos;Utilisation dans leur intégralité. Ces conditions constituent un contrat juridiquement contraignant entre vous et Sales Companion 2.0.
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
                          background: '#f5a623',
                          marginTop: '8px',
                          flexShrink: 0
                        }}
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
              {'extra' in section && section.extra && (
                <p
                  style={{
                    color: 'var(--tx2)',
                    lineHeight: 1.8,
                    fontSize: '14px',
                    marginTop: '14px',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--bd)'
                  }}
                >
                  {section.extra}
                </p>
              )}
            </section>
          ))}
        </div>

        {/* Plans summary cards */}
        <div
          style={{
            marginTop: '48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '16px'
          }}
        >
          {[
            { name: 'Gratuit', price: '0 FCFA', searches: '10/jour', color: 'var(--tx3)' },
            { name: 'Starter', price: 'Sur devis', searches: '50/jour', color: '#60a5fa' },
            { name: 'Pro', price: 'Sur devis', searches: '200/jour', color: 'var(--gm)' },
            { name: 'Enterprise', price: 'Sur devis', searches: '1 000/jour', color: '#f5a623' }
          ].map((plan) => (
            <div
              key={plan.name}
              style={{
                background: 'var(--dark2)',
                border: '1px solid var(--bd)',
                borderRadius: '12px',
                padding: '18px 20px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '14px', color: plan.color, marginBottom: '4px' }}>
                {plan.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--tx3)', marginBottom: '8px' }}>
                {plan.searches}
              </div>
              <div style={{ fontWeight: 700, color: 'var(--tx)', fontSize: '13px' }}>
                {plan.price}
              </div>
            </div>
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
            Des questions sur les conditions ?
          </h3>
          <p style={{ color: 'var(--tx2)', marginBottom: '28px', fontSize: '14px', lineHeight: 1.7 }}>
            Notre équipe juridique et commerciale est disponible pour vous éclairer sur tout aspect de ces conditions.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="mailto:support@salescompanion2-0.com"
              className="btn btn-primary btn-md"
            >
              ✉️ Nous contacter
            </a>
            <Link href="/privacy" className="btn btn-outline btn-md">
              Politique de confidentialité →
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
          <Link href="/privacy" style={{ color: 'var(--tx3)', fontSize: '13px', textDecoration: 'none' }}>Confidentialité</Link>
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
