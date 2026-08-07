import { Database, KanbanSquare, Users, Sparkles, WifiOff, FileSpreadsheet } from 'lucide-react'

const features = [
  {
    icon: Database,
    title: 'Annuaire des entreprises',
    description:
      'Accédez aux coordonnées de 500K+ entreprises camerounaises. Filtrez par secteur, région et ville pour cibler vos prospects idéaux.',
    tag: '500K+ fiches'
  },
  {
    icon: KanbanSquare,
    title: 'Pipeline commercial CRM',
    description:
      'Suivez chaque prospect de la prospection à la conclusion. Visualisez l\'avancement de vos négociations et ne manquez aucune relance.',
    tag: 'Kanban interactif'
  },
  {
    icon: Users,
    title: 'Gestion d\'équipe commerciale',
    description:
      'Assignez des prospects à vos commerciaux en deux clics et pilotez l\'activité de toute l\'équipe depuis un dashboard manager en temps réel.',
    tag: 'Dashboard Manager'
  },
  {
    icon: Sparkles,
    title: 'Companion IA (Pro & Enterprise)',
    description:
      'Une IA commerciale qui rédige vos emails de prise de contact et vous conseille sur les opportunités du marché camerounais.',
    tag: 'Assistant IA'
  },
  {
    icon: WifiOff,
    title: 'Mode 100% Hors-ligne (PWA)',
    description:
      'Installez l\'application sur votre smartphone. Consultez vos données et vos prospects sauvegardés même en zone sans réseau.',
    tag: 'PWA Mobile'
  },
  {
    icon: FileSpreadsheet,
    title: 'Export Excel & Filtres',
    description:
      'Exportez vos listes de prospects ciblées vers Excel en un clic pour vos campagnes terrain ou téléphoniques.',
    tag: 'Export 1-Click'
  }
]

export function Features() {
  return (
    <section id="fonctionnalites" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Fonctionnalités</p>
        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
          Tout ce qu&apos;il faut pour prospecter au Cameroun
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          Une seule plateforme, de la recherche du bon contact jusqu&apos;à la signature.
        </p>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 shadow-sm">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group bg-card p-7 md:p-8 transition-all hover:bg-secondary/50 relative flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
                  {feature.tag}
                </span>
              </div>
              <h3 className="mt-5 font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
