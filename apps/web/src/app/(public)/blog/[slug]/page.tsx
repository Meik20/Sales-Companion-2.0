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
  },
  'annuaire-entreprises-btp-douala': {
    title: 'Annuaire des entreprises BTP à Douala : le guide complet 2026',
    description: 'Le secteur du Bâtiment et Travaux Publics à Douala compte plus de 4 200 entreprises actives. Ce guide vous donne les clés pour identifier les bons interlocuteurs et décrocher des marchés.',
    date: '11 juin 2026',
    readTime: '6 min',
    category: 'Annuaire',
    emoji: '🏗️',
    content: (
      <>
        <p className="blog-lead">
          Le secteur du Bâtiment et des Travaux Publics (BTP) à Douala est un moteur essentiel de l'économie camerounaise. Avec la multiplication des projets d'infrastructures et de promotion immobilière, cibler ce secteur représente une opportunité majeure pour les entreprises B2B.
        </p>

        <h2>1. Cartographie du secteur BTP à Douala</h2>
        <p>
          Douala, capitale économique, concentre la majorité des grands acteurs du BTP. On y distingue plusieurs catégories d'entreprises :
        </p>
        <ul>
          <li><strong>Les majors internationaux :</strong> Souvent positionnés sur les grands chantiers d'État (routes, ponts, ports).</li>
          <li><strong>Les PME locales structurées :</strong> Actives dans la promotion immobilière privée et la sous-traitance.</li>
          <li><strong>Les fournisseurs de matériaux :</strong> Cimenteries, métallurgie, bois, qui forment un écosystème connexe très dynamique.</li>
        </ul>

        <h2>2. Qui sont les vrais décideurs ?</h2>
        <p>
          Dans le BTP, le cycle de vente est complexe car les décideurs varient selon la taille du projet.
        </p>
        <blockquote>
          "Ne vous limitez pas au Directeur Général. Sur les chantiers, le Chef de Projet ou le Directeur des Achats détient souvent le véritable pouvoir de prescription."
        </blockquote>
        <p>
          Si vous vendez des équipements de sécurité (EPI) ou des matériaux, ciblez le <strong>Directeur des Achats</strong>. Si vous proposez des logiciels de gestion de chantier, le <strong>Directeur Technique</strong> ou le <strong>DG</strong> seront vos meilleurs interlocuteurs.
        </p>

        <h2>3. Les défis de la prospection dans le BTP</h2>
        <p>
          Les entreprises de BTP sont souvent difficiles à joindre car leurs équipes sont sur le terrain. Les emails non sollicités ont peu de chance d'aboutir. Il est impératif d'adopter une approche terrain et de se rendre sur les bases vie ou de participer aux salons professionnels spécialisés.
        </p>

        <h2>4. L'avantage d'un annuaire spécialisé avec Sales Companion</h2>
        <p>
          Trouver les coordonnées à jour des entreprises du BTP à Douala peut être un véritable parcours du combattant. <strong>Sales Companion 2.0</strong> vous facilite la tâche.
        </p>
        <ul>
          <li><strong>Base de données qualifiée :</strong> Accédez à une liste exhaustive des entreprises de construction, génie civil et architecture à Douala.</li>
          <li><strong>Contacts directs :</strong> Obtenez les numéros de téléphone et emails des dirigeants et responsables achats.</li>
          <li><strong>Veille stratégique :</strong> Suivez les nouvelles créations d'entreprises dans le secteur grâce aux données RCCM intégrées.</li>
        </ul>

        <div className="blog-cta">
          <h3>Accédez à l'annuaire BTP complet de Douala</h3>
          <p>Identifiez vos futurs clients dès aujourd'hui avec Sales Companion 2.0.</p>
          <Link href="/register" className="btn btn-primary btn-lg">
            Créer un compte gratuit
          </Link>
        </div>
      </>
    )
  },
  'niu-rccm-identifier-entreprise-camerounaise': {
    title: 'NIU et RCCM : comment identifier une entreprise camerounaise',
    description: "Comprendre le NIU (Numéro d'Identification Unique) et le RCCM (Registre du Commerce et du Crédit Mobilier) est essentiel pour tout commercial B2B. Ce guide vous explique comment les utiliser pour vérifier et qualifier vos prospects.",
    date: '11 juin 2026',
    readTime: '5 min',
    category: 'Guide',
    emoji: '📋',
    content: (
      <>
        <p className="blog-lead">
          Dans l'écosystème B2B camerounais, la vérification de l'existence légale et de la santé fiscale d'une entreprise est une étape non négociable avant la signature de tout contrat. Le NIU et le RCCM sont vos deux meilleurs alliés.
        </p>

        <h2>1. Qu'est-ce que le RCCM ?</h2>
        <p>
          Le <strong>Registre du Commerce et du Crédit Mobilier (RCCM)</strong> est la carte d'identité juridique de l'entreprise. Il prouve que la société est légalement constituée au Cameroun.
        </p>
        <ul>
          <li><strong>Ce qu'il vous apprend :</strong> La date de création, la forme juridique (SARL, SA, SAS), l'identité des dirigeants et le siège social officiel.</li>
          <li><strong>Pourquoi c'est crucial :</strong> Un prospect sans RCCM valide est un risque d'impayé majeur. C'est également indispensable pour établir des factures conformes.</li>
        </ul>

        <h2>2. Le rôle central du NIU</h2>
        <p>
          Le <strong>Numéro d'Identifiant Unique (NIU)</strong>, délivré par la Direction Générale des Impôts (DGI), atteste que l'entreprise est connue des services fiscaux.
        </p>
        <blockquote>
          "Depuis les récentes réformes fiscales, aucune transaction B2B sérieuse, ni aucun paiement administratif, ne peut s'effectuer sans présentation d'un NIU valide et de l'Attestation de Non Redevance (ANR)."
        </blockquote>

        <h2>3. Comment utiliser ces données pour qualifier vos prospects ?</h2>
        <p>
          Avant de mobiliser vos commerciaux sur le terrain, effectuez une pré-qualification :
        </p>
        <ol>
          <li>Demandez systématiquement le NIU et le RCCM lors du premier contact qualifié.</li>
          <li>Vérifiez la concordance entre l'adresse déclarée au RCCM et l'emplacement physique de l'entreprise.</li>
          <li>Assurez-vous que l'activité déclarée correspond bien aux services ou produits que vous souhaitez leur vendre.</li>
        </ol>

        <h2>4. Automatisez vos vérifications avec Sales Companion</h2>
        <p>
          Récolter ces informations manuellement prend un temps précieux. <strong>Sales Companion 2.0</strong> centralise ces données légales pour vous.
        </p>
        <ul>
          <li><strong>Profils enrichis :</strong> Les fiches entreprises incluent les numéros NIU et RCCM lorsque disponibles publiquement.</li>
          <li><strong>Qualification accélérée :</strong> Concentrez-vous sur des prospects dont l'existence légale est déjà pré-vérifiée.</li>
        </ul>

        <div className="blog-cta">
          <h3>Qualifiez vos prospects plus rapidement</h3>
          <p>Utilisez notre base de données enrichie pour identifier des entreprises viables.</p>
          <Link href="/register" className="btn btn-primary btn-lg">
            Démarrer gratuitement
          </Link>
        </div>
      </>
    )
  },
  'prospection-commerciale-cameroun-methodes-outils': {
    title: 'Prospection commerciale terrain au Cameroun : méthodes et outils',
    description: "Le terrain reste le principal canal de vente au Cameroun. Comment combiner la prospection physique avec les outils numériques pour maximiser votre taux de conversion ? Découvrez les meilleures pratiques des équipes commerciales les plus performantes.",
    date: '11 juin 2026',
    readTime: '7 min',
    category: 'Stratégie',
    emoji: '🗺️',
    content: (
      <>
        <p className="blog-lead">
          Au Cameroun, la digitalisation progresse, mais le "business" se conclut encore majoritairement en face-à-face. La confiance s'établit par la présence physique. Cependant, la prospection terrain classique coûte cher (temps, transport) et doit être optimisée.
        </p>

        <h2>1. Le mythe de la prospection "à l'aveugle"</h2>
        <p>
          Faire du porte-à-porte dans le quartier d'Akwa ou à la zone industrielle de Bassa sans plan préalable est une perte de temps. Le taux d'absence des décideurs frôle les 80%.
        </p>
        <ul>
          <li><strong>La préparation est reine :</strong> Identifiez les entreprises d'une zone spécifique avant de vous déplacer.</li>
          <li><strong>La règle du "Warm Calling" :</strong> Précédez toujours votre visite d'un appel téléphonique, même pour simplement parler à l'assistante de direction et obtenir le nom du décideur.</li>
        </ul>

        <h2>2. Les codes du terrain au Cameroun</h2>
        <p>
          Réussir sa prospection physique demande de maîtriser certains codes locaux :
        </p>
        <blockquote>
          "Le barrage de la réceptionniste ou du vigile est le premier test du commercial. Soyez professionnel, courtois, et n'hésitez pas à laisser une belle plaquette physique, elle circule encore très bien dans les bureaux."
        </blockquote>

        <h2>3. L'approche hybride : Terrain + Digital</h2>
        <p>
          Le commercial performant en 2026 ne choisit pas entre le terrain et le digital, il fusionne les deux :
        </p>
        <ol>
          <li><strong>Ciblage digital :</strong> Utilisation de LinkedIn et de bases de données pour identifier les cibles.</li>
          <li><strong>Prise de contact multicanal :</strong> WhatsApp (très utilisé dans le B2B camerounais), appels, puis visite.</li>
          <li><strong>Suivi digitalisé :</strong> Compte-rendu immédiat dans le CRM après la visite.</li>
        </ol>

        <h2>4. L'outil du commercial nomade : Sales Companion 2.0</h2>
        <p>
          Pour maximiser l'efficacité de vos commerciaux sur le terrain, équipez-les d'outils adaptés à leur réalité.
        </p>
        <ul>
          <li><strong>Préparation de tournées :</strong> Visualisez les entreprises par quartier à Douala ou Yaoundé.</li>
          <li><strong>Historique à portée de main :</strong> Consultez les notes des précédentes visites avant d'entrer chez un prospect.</li>
          <li><strong>Reporting instantané :</strong> Saisissez vos comptes-rendus de visite en quelques clics depuis votre mobile.</li>
        </ul>

        <div className="blog-cta">
          <h3>Équipez vos commerciaux pour le terrain</h3>
          <p>Donnez-leur les moyens d'être plus efficaces avec Sales Companion 2.0.</p>
          <Link href="/register" className="btn btn-primary btn-lg">
            Essayer l'application
          </Link>
        </div>
      </>
    )
  },
  'crm-commerciaux-cameroun-comparatif-2026': {
    title: 'CRM pour commerciaux au Cameroun : comparatif 2026',
    description: "Salesforce, HubSpot, ou une solution locale adaptée au marché camerounais ? Ce comparatif honnête vous aide à choisir le bon outil CRM selon votre taille d'équipe et votre budget.",
    date: '11 juin 2026',
    readTime: '9 min',
    category: 'Outils',
    emoji: '⚙️',
    content: (
      <>
        <p className="blog-lead">
          Le tableau Excel a vécu. Pour structurer une force de vente performante au Cameroun, l'adoption d'un CRM (Customer Relationship Management) est devenue incontournable. Mais face à la multitude d'offres mondiales, laquelle choisir pour les réalités locales ?
        </p>

        <h2>1. Les géants mondiaux : Salesforce et HubSpot</h2>
        <p>
          <strong>Salesforce</strong> et <strong>HubSpot</strong> sont les leaders incontestés sur le marché mondial.
        </p>
        <ul>
          <li><strong>Avantages :</strong> Puissance absolue, écosystème d'intégrations infini, fonctionnalités marketing avancées.</li>
          <li><strong>Inconvénients au Cameroun :</strong> Coût d'acquisition très élevé (facturé en devises), complexité de mise en œuvre nécessitant souvent des consultants coûteux, et des fonctionnalités parfois inadaptées (ex: intégrations téléphoniques VOIP peu utiles face à l'usage dominant du mobile et de WhatsApp).</li>
        </ul>

        <h2>2. Les solutions "Mid-Market" : Pipedrive et Zoho CRM</h2>
        <p>
          Ces solutions sont souvent plébiscitées par les PME cherchant un compromis.
        </p>
        <ul>
          <li><strong>Pipedrive :</strong> Excellent pour sa vue pipeline et sa simplicité d'utilisation par les commerciaux.</li>
          <li><strong>Zoho CRM :</strong> Très complet et abordable, mais l'interface peut sembler datée et parfois complexe à paramétrer.</li>
        </ul>

        <h2>3. L'enjeu majeur : La base de données intégrée</h2>
        <p>
          Le principal problème des CRM classiques au Cameroun, c'est qu'ils sont livrés "vides". Vos commerciaux doivent passer des heures à chercher des contacts sur internet, à vérifier les NIU, etc.
        </p>
        <blockquote>
          "Un CRM sans données qualifiées est comme une Ferrari sans carburant. L'enjeu en Afrique subsaharienne n'est pas seulement de gérer le contact, mais d'abord de le trouver."
        </blockquote>

        <h2>4. L'alternative pensée pour le marché local : Sales Companion 2.0</h2>
        <p>
          Contrairement aux solutions occidentales, <strong>Sales Companion 2.0</strong> a été conçu spécifiquement pour les enjeux des commerciaux en Afrique francophone, et particulièrement au Cameroun.
        </p>
        <ul>
          <li><strong>Base de données pré-intégrée :</strong> Dès la connexion, vous accédez à l'annuaire de dizaines de milliers d'entreprises camerounaises (Douala, Yaoundé, etc.).</li>
          <li><strong>Tarification adaptée :</strong> Pas de facturation complexe en dollars, une offre claire et abordable pour les PME locales.</li>
          <li><strong>Simplicité extrême :</strong> Une interface intuitive qui ne nécessite aucune formation longue pour vos équipes terrain.</li>
        </ul>

        <div className="blog-cta">
          <h3>Découvrez le CRM qui intègre déjà vos futurs clients</h3>
          <p>Comparez par vous-même l'efficacité de Sales Companion 2.0.</p>
          <Link href="/register" className="btn btn-primary btn-lg">
            Créer un compte d'essai
          </Link>
        </div>
      </>
    )
  },
  'secteurs-actifs-douala-2026': {
    title: 'Les 10 secteurs d\'activité les plus actifs à Douala en 2026',
    description: "Douala concentre 60% du tissu économique camerounais. Quels secteurs affichent la plus forte croissance ? Commerce, BTP, Tech, Finance, Agroalimentaire : une analyse des opportunités pour les commerciaux B2B.",
    date: '11 juin 2026',
    readTime: '6 min',
    category: 'Marché',
    emoji: '📊',
    content: (
      <>
        <p className="blog-lead">
          Pour optimiser sa prospection B2B, il faut cibler là où la croissance se trouve. Douala, véritable poumon économique de la sous-région CEMAC, voit émerger et se consolider plusieurs secteurs clés. Voici les domaines les plus porteurs pour vos ventes en 2026.
        </p>

        <h2>1. L'Agroalimentaire et la transformation locale</h2>
        <p>
          Poussé par la politique d'import-substitution, le secteur de la transformation locale explose. Des PME émergent dans la transformation du cacao, du poivre de Penja, et des fruits locaux. Ces entreprises ont des besoins croissants en équipements, packaging et services logistiques.
        </p>

        <h2>2. La Logistique et le Transit</h2>
        <p>
          Avec le Port Autonome de Douala et l'interconnexion avec le port de Kribi, la logistique reste le secteur historique et dominant. Les acteurs de la supply chain sont des cibles privilégiées pour les services B2B (assurances, logiciels de flotte, maintenance).
        </p>

        <h2>3. Le Bâtiment et les Travaux Publics (BTP)</h2>
        <p>
          L'urbanisation galopante de Douala (Bonamoussadi, Yassa, Japoma) soutient une demande forte en construction résidentielle et commerciale. Le secteur est vaste, allant des grands cimentiers aux petites entreprises de second œuvre.
        </p>

        <h2>4. L'Économie Numérique et la Fintech</h2>
        <p>
          Les startups tech et les entreprises de services numériques se multiplient, particulièrement dans les quartiers d'Akwa et Bonanjo. Ce sont des entreprises très friandes de solutions SaaS, d'équipements informatiques et de conseil en stratégie.
        </p>

        <h2>5. Les autres secteurs en tension</h2>
        <ul>
          <li><strong>La Santé et la Pharmacie :</strong> Création de nouvelles cliniques et centres de distribution.</li>
          <li><strong>L'Énergie (notamment solaire) :</strong> Pour pallier les coupures, le marché des énergies renouvelables B2B est en plein essor.</li>
          <li><strong>La Distribution de gros :</strong> Les importateurs de biens de grande consommation.</li>
        </ul>

        <blockquote>
          "Le secret d'une prospection réussie à Douala est la segmentation. Ne vendez pas de la même manière à une startup Tech d'Akwa et à une usine agroalimentaire de Bassa."
        </blockquote>

        <h2>Comment exploiter ces tendances ?</h2>
        <p>
          Avoir connaissance de ces secteurs est une chose, identifier les entreprises qui les composent en est une autre. <strong>Sales Companion 2.0</strong> vous permet de filtrer la base de données économique du Cameroun directement par secteur d'activité.
        </p>

        <div className="blog-cta">
          <h3>Explorez les secteurs clés de Douala</h3>
          <p>Trouvez vos prochains clients dans les industries en croissance.</p>
          <Link href="/register" className="btn btn-primary btn-lg">
            Rechercher des entreprises
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
