'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  Building2,
  KanbanSquare,
  Search,
  Users,
  Smartphone,
  Sparkles,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import { routes } from '@/constants/routes'

interface DeepDiveFeature {
  tag: string
  icon: typeof Building2
  title: string
  description: string
  bullets: string[]
  illustration: string
  alt: string
  ctaText: string
  ctaLink: string
  reverse: boolean
}

const deepDiveFeatures: DeepDiveFeature[] = [
  {
    tag: 'Annuaire B2B Cameroun',
    icon: Building2,
    title: '500 000+ entreprises camerounaises répertoriées et vérifiées',
    description:
      'Accédez en direct au plus vaste annuaire B2B du pays. Filtrez par ville (Douala, Yaoundé, Bafoussam...), secteur d’activité et type de structure pour identifier et contacter directement les bons décideurs.',
    bullets: [
      'Coordonnées complètes : téléphones, emails professionnels, adresses et localisation précise',
      'Fiches entreprises enrichies avec informations légales et fiscales (NIU, RCCM)',
      'Mise à jour continue et suppression des doublons pour des données fiables'
    ],
    illustration: '/illustrations/landing/cameroon-directory.png',
    alt: 'Annuaire des entreprises camerounaises vérifiées avec Sales Companion 2.0',
    ctaText: 'Explorer l’annuaire',
    ctaLink: routes.register,
    reverse: false
  },
  {
    tag: 'Pipeline CRM interactif',
    icon: KanbanSquare,
    title: 'Suivez chaque opportunité de la prospection au closing',
    description:
      'Ne laissez plus aucun prospect s’endormir. Notre tableau Kanban intuitif vous offre une visibilité totale sur l’ensemble de vos négociations et accélère la signature de vos contrats.',
    bullets: [
      'Étapes de vente personnalisables : Nouveau lead, Contact pris, Négociation, Gagné',
      'Glisser-déposer fluide pour actualiser l’état de vos affaires en un geste',
      'Historique complet des interactions, comptes-rendus d’appels et rappels de relance'
    ],
    illustration: '/illustrations/landing/pipeline-crm.png',
    alt: 'Pipeline commercial Kanban pour gérer vos prospects et ventes',
    ctaText: 'Découvrir le CRM',
    ctaLink: routes.register,
    reverse: true
  },
  {
    tag: 'Prospection ultra-ciblée',
    icon: Search,
    title: 'Trouvez vos futurs clients idéaux en quelques secondes',
    description:
      'Ciblez précisément votre marché sans perdre de temps en recherches manuelles. Extrayez instantanément les entreprises correspondant à vos critères de vente prioritaires.',
    bullets: [
      'Moteur de recherche multicritère par région, ville, secteur et taille d’entreprise',
      'Sauvegarde de vos segments de prospection favoris en un clic',
      'Exportation directe vers Excel pour vos tournées de terrain et campagnes d’appels'
    ],
    illustration: '/illustrations/landing/search-prospection.png',
    alt: 'Recherche et prospection ciblée d’entreprises au Cameroun',
    ctaText: 'Lancer une recherche',
    ctaLink: routes.register,
    reverse: false
  },
  {
    tag: 'Management & Synergie d’équipe',
    icon: Users,
    title: 'Pilotez votre force commerciale avec une fluidité totale',
    description:
      'Que vous gériez 2 ou 50 commerciaux sur le terrain, répartissez les portefeuilles, éliminez les doublons de démarchage et pilotez les performances individuelles et collectives en temps réel.',
    bullets: [
      'Attribution immédiate des prospects et gestion des accès par rôle',
      'Dashboard manager centralisé avec vision globale sur les activités et signatures',
      'Partage sécurisé et support cross-team pour fluidifier la transmission des dossiers'
    ],
    illustration: '/illustrations/landing/team-collaboration.png',
    alt: 'Gestion et collaboration d’équipe commerciale sur Sales Companion',
    ctaText: 'Gérer votre équipe',
    ctaLink: routes.register,
    reverse: true
  },
  {
    tag: 'Terrain & 100% Hors-ligne',
    icon: Smartphone,
    title: 'Prospectez partout, même sans aucune connexion Internet',
    description:
      'Les coupures de réseau ou les zones blanches au Cameroun ne doivent plus freiner vos ventes. Sales Companion s’installe directement sur votre smartphone et reste 100% opérationnel hors-ligne.',
    bullets: [
      'Application PWA installable en 1 clic sur Android et iPhone (sans store)',
      'Consultation et saisie de vos prospects et opportunités en mode déconnecté',
      'Synchronisation automatique et transparente dès le retour de votre connexion'
    ],
    illustration: '/illustrations/landing/offline-pwa.png',
    alt: 'Application mobile PWA fonctionnant 100% hors-ligne au Cameroun',
    ctaText: 'Installer sur mobile',
    ctaLink: '#pwa-install',
    reverse: false
  }
]

const complementaryFeatures = [
  {
    icon: Sparkles,
    title: 'Companion IA Pro',
    description:
      'Un assistant IA spécialisé dans le marché camerounais qui rédige vos messages de prospection et analyse vos opportunités.'
  },
  {
    icon: FileSpreadsheet,
    title: 'Export Excel 1-Click',
    description:
      'Téléchargez vos listes de prospects filtrées directement au format Excel pour vos équipes terrain ou vos analyses externes.'
  },
  {
    icon: ShieldCheck,
    title: 'Données Sécurisées & Privées',
    description:
      'Vos contacts et prospects restent strictement confidentiels. Chiffrement HTTPS/TLS et zéro revente de données.'
  }
]

export function Features() {
  return (
    <section id="fonctionnalites" className="relative overflow-hidden py-20 md:py-32">
      {/* Background ambient accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_20%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent)]"
      />

      <div className="mx-auto max-w-6xl px-5">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Fonctionnalités & Piliers CRM
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl text-balance">
            Tout pour prospecter, vendre et piloter au Cameroun
          </h2>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground text-pretty">
            Découvrez une plateforme tout-en-un alliant la puissance d’un annuaire B2B vérifié, un
            pipeline commercial réactif et des outils conçus pour la réalité du terrain africain.
          </p>
        </div>

        {/* 5 Alternating Deep-Dive Blocks (Option B) */}
        <div className="mt-20 space-y-24 md:space-y-32">
          {deepDiveFeatures.map((feature, idx) => (
            <div
              key={feature.title}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              {/* Illustration Side */}
              <div
                className={`relative ${
                  feature.reverse ? 'lg:order-2' : 'lg:order-1'
                }`}
              >
                <div className="relative flex items-center justify-center overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card/90 via-card/50 to-primary/5 p-6 sm:p-10 shadow-xl shadow-primary/5 group hover:border-primary/40 transition-all duration-300">
                  {/* Subtle decorative glow */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-12 -bottom-12 h-52 w-52 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all duration-500"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/15 transition-all duration-500"
                  />

                  <Image
                    src={feature.illustration}
                    alt={feature.alt}
                    width={640}
                    height={400}
                    priority={idx === 0}
                    className="relative z-10 h-auto w-full max-h-[340px] sm:max-h-[380px] object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              </div>

              {/* Text / Information Side */}
              <div
                className={`flex flex-col items-start ${
                  feature.reverse ? 'lg:order-1' : 'lg:order-2'
                }`}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3.5 py-1 text-xs font-medium text-foreground">
                  <feature.icon className="h-3.5 w-3.5 text-primary" />
                  {feature.tag}
                </span>

                <h3 className="mt-4 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-balance">
                  {feature.title}
                </h3>

                <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
                  {feature.description}
                </p>

                {/* Key Benefits List */}
                <ul className="mt-6 space-y-3 w-full">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1B7A3E] mt-0.5" />
                      <span className="text-sm leading-relaxed text-foreground/90">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Call to action link */}
                <div className="mt-8">
                  <Link
                    href={feature.ctaLink}
                    className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:scale-[1.02] active:scale-[0.98] border border-border hover:border-primary"
                  >
                    {feature.ctaText}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Complementary Features Grid */}
        <div className="mt-28 border-t border-border pt-16">
          <div className="text-center">
            <h3 className="font-heading text-xl font-semibold text-foreground sm:text-2xl">
              Et d’autres atouts indispensables au quotidien
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Des outils intégrés pour vous faire gagner un temps précieux à chaque étape.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {complementaryFeatures.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:bg-secondary/40"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <h4 className="mt-4 font-heading text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
