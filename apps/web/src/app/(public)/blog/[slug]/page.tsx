import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { ScIcon } from '@/components/ui/ScIcon'
import '@/features/landing/styles/landing.css'

// ── Données des Articles (Simulation DB/CMS) ─────────────────────────────
const ARTICLES_CONTENT: Record<string, {
  title: string
  description: string
  date: string
  readTime: string
  category: string
  emoji: string
  content: React.ReactNode
}> = {
  'trouver-clients-b2b-cameroun-2026': {
    title: 'Comment trouver des clients B2B au Cameroun en 2026',
    description: 'Guide complet pour identifier, prospecter et signer des clients B2B au Cameroun.',
    date: '11 juin 2026',
    readTime: '8 min',
    category: 'Prospection',
    emoji: '🎯',
    content: (
      <>
        <p className="blog-lead">
          Le marché B2B camerounais est en pleine mutation. Longtemps dominé par le bouche-à-oreille
          et les réseaux personnels, l'acquisition de clients B2B se structure aujourd'hui autour
          de processus de vente hybrides : présence digitale et agressivité terrain. Voici comment
          réussir votre prospection au Cameroun en 2026.
        </p>

        <h2>1. Ciblez précisément vos prospects (Douala vs Yaoundé)</h2>
        <p>
          Au Cameroun, la géographie économique est binaire mais très marquée. <strong>Douala</strong> concentre
          plus de 60% de l'activité économique (industries, logistique, transit, commerce import-export).
          <strong> Yaoundé</strong> est le centre décisionnel (institutions publiques, ONG, services administratifs).
        </p>
        <ul>
          <li><strong>Si vous vendez des logiciels de gestion de stock :</strong> Visez la zone industrielle de Bassa et Bonabéri à Douala.</li>
          <li><strong>Si vous vendez des services de consulting institutionnel :</strong> Ciblez les quartiers administratifs de Yaoundé (Bastos, Centre-Ville).</li>
        </ul>

        <h2>2. Exploitez les données publiques (NIU & RCCM)</h2>
        <p>
          L'identification légale est le premier filtre d'un bon prospect. Avant de vous déplacer, assurez-vous que
          l'entreprise est enregistrée. Le <strong>Numéro d'Identifiant Unique (NIU)</strong> et le{' '}
          <strong>Registre du Commerce et du Crédit Mobilier (RCCM)</strong> sont des données publiques que vous pouvez
          utiliser pour qualifier un lead et trouver son siège social.
        </p>

        <h2>3. L'importance du "Cold Calling" combiné au Terrain</h2>
        <p>
          La prospection par email ("cold emailing") affiche des taux d'ouverture très faibles au Cameroun (&lt; 5%).
          Les décideurs camerounais privilégient le contact humain direct et les appels téléphoniques.
        </p>
        <blockquote>
          "Le processus idéal : Identifiez via LinkedIn ou un annuaire B2B → Appelez le standard pour obtenir le nom du décideur → Déplacez-vous physiquement avec une plaquette commerciale."
        </blockquote>

        <h2>4. L'outil indispensable : Sales Companion 2.0</h2>
        <p>
          Constituer une base de données qualifiée prend des mois aux équipes commerciales. Pour accélérer ce processus,
          un CRM B2B local est indispensable. <strong>Sales Companion 2.0</strong> intègre une base de données de plus de
          50 000 entreprises camerounaises avec le nom des dirigeants, les numéros de téléphone et la géolocalisation exacte.
        </p>

        <h3>Fonctionnalités clés pour la prospection :</h3>
        <ul>
          <li><strong>Filtre par secteur :</strong> Trouvez toutes les PME de l'agroalimentaire en un clic.</li>
          <li><strong>Géolocalisation :</strong> Optimisez vos tournées commerciales sur le terrain.</li>
          <li><strong>Suivi des interactions :</strong> N'oubliez plus jamais de relancer un prospect.</li>
        </ul>

        <div className="blog-cta">
          <h3>Prêt à booster vos ventes au Cameroun ?</h3>
          <p>Testez gratuitement Sales Companion 2.0 et accédez à notre base de données d'entreprises.</p>
          <Link href="/register" className="btn btn-primary btn-lg">
            Créer un compte gratuit
          </Link>
        </div>
      </>
    )
  }
}

// ── SSG (Static Site Generation) ──────────────────────────────────────────
export async function generateStaticParams() {
  return [
    { slug: 'trouver-clients-b2b-cameroun-2026' },
    { slug: 'annuaire-entreprises-btp-douala' },
    { slug: 'niu-rccm-identifier-entreprise-camerounaise' },
    { slug: 'prospection-commerciale-cameroun-methodes-outils' },
    { slug: 'crm-commerciaux-cameroun-comparatif-2026' },
    { slug: 'secteurs-actifs-douala-2026' }
  ]
}

// ── SEO Metadata Dynamique ───────────────────────────────────────────────
export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const resolvedParams = await params
  const article = ARTICLES_CONTENT[resolvedParams.slug]

  // Fallback si l'article n'est pas encore rédigé (en attente)
  if (!article) {
    return {
      title: 'Article à venir | Sales Companion 2.0',
      description: 'Cet article est en cours de rédaction.'
    }
  }

  return {
    title: `${article.title} | Blog Sales Companion 2.0`,
    description: article.description,
    alternates: {
      canonical: `https://salescompanion2-0.com/blog/${resolvedParams.slug}`
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `https://salescompanion2-0.com/blog/${resolvedParams.slug}`,
      type: 'article',
      publishedTime: new Date().toISOString()
    }
  }
}

// ── Page Component ───────────────────────────────────────────────────────
export default async function BlogPostPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = await params
  const article = ARTICLES_CONTENT[resolvedParams.slug]

  if (!article) {
    return (
      <div className="landing-root" style={{ textAlign: 'center', padding: '100px 24px' }}>
        <h2>⏳ Article en cours de rédaction</h2>
        <p style={{ color: 'var(--tx2)', marginBottom: '24px' }}>
          L'article "{resolvedParams.slug}" sera bientôt disponible.
        </p>
        <Link href="/blog" className="btn btn-primary btn-md">← Retour au blog</Link>
      </div>
    )
  }

  return (
    <div className="landing-root">
      {/* Navbar Minimaliste */}
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            <ScIcon size={24} className="sc-icon" />
            <span className="nav-brand-text">
              Sales <em>Companion</em>
            </span>
          </Link>
          <div className="nav-links">
            <Link href="/blog" style={{ color: 'var(--tx2)', fontSize: '13px' }}>
              ← Retour au blog
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Article */}
      <header
        style={{
          padding: '80px 24px 40px',
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>{article.emoji}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          <span
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--tx2)',
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            {article.category}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>
            Publié le {article.date} · {article.readTime} de lecture
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(28px, 4vw, 46px)',
            fontWeight: '800',
            lineHeight: '1.2',
            letterSpacing: '-0.02em',
            color: 'var(--tx)'
          }}
        >
          {article.title}
        </h1>
      </header>

      {/* Contenu Article */}
      <main
        className="blog-content"
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '0 24px 100px'
        }}
      >
        {article.content}
      </main>

      {/* Styles inline rapides pour la typographie du blog */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .blog-content {
          font-size: 16px;
          line-height: 1.8;
          color: var(--tx2);
        }
        .blog-content h2 {
          font-family: 'Syne', sans-serif;
          color: var(--tx);
          font-size: 24px;
          margin: 48px 0 20px;
          letter-spacing: -0.01em;
        }
        .blog-content h3 {
          font-family: 'Syne', sans-serif;
          color: var(--tx);
          font-size: 20px;
          margin: 32px 0 16px;
        }
        .blog-content p {
          margin-bottom: 24px;
        }
        .blog-content ul {
          margin-bottom: 24px;
          padding-left: 24px;
        }
        .blog-content li {
          margin-bottom: 10px;
        }
        .blog-lead {
          font-size: 19px;
          color: var(--tx);
          font-weight: 500;
          line-height: 1.6;
          margin-bottom: 40px !important;
        }
        .blog-content blockquote {
          border-left: 4px solid var(--gm);
          padding: 16px 24px;
          background: rgba(46, 160, 90, 0.05);
          border-radius: 0 12px 12px 0;
          font-style: italic;
          color: var(--tx);
          margin: 32px 0;
          font-size: 17px;
        }
        .blog-cta {
          margin-top: 60px;
          padding: 40px 32px;
          background: var(--dark2);
          border: 1px solid var(--bd);
          border-radius: 16px;
          text-align: center;
        }
        .blog-cta h3 {
          margin-top: 0;
        }
      `}} />
    </div>
  )
}
