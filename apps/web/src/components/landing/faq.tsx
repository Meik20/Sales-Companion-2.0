import { Plus } from 'lucide-react'

const faqs = [
  {
    question: "D'où proviennent les données des entreprises ?",
    answer:
      "Nos données sont agrégées à partir de sources officielles publiques (RCCM, NIU) et de vérifications de terrain pour garantir la meilleure fiabilité sur les entreprises actives au Cameroun."
  },
  {
    question: "Puis-je utiliser l'application sans connexion Internet ?",
    answer:
      "Oui ! Sales Companion 2.0 est une Progressive Web App (PWA). Vous pouvez l'installer sur votre téléphone (iOS/Android) ou ordinateur. Vos prospects et fiches sauvegardées restent accessibles 100% hors-ligne."
  },
  {
    question: "Comment fonctionnent les quotas de recherche ?",
    answer:
      "Le plan Gratuit offre 10 recherches par mois. Les abonnements payants vous offrent un quota quotidien réinitialisé automatiquement chaque jour à minuit (Starter: 10/jour, Pro: 20/jour, Enterprise: 50/jour)."
  },
  {
    question: "Comment ajouter des commerciaux à mon équipe ?",
    answer:
      "Avec le plan Enterprise, le manager dispose d'un tableau de bord d'administration dédié pour inviter des membres, créer des comptes et leur assigner des portefeuilles de prospects ciblés."
  }
]

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20 md:py-28 border-t border-border">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Questions fréquentes</p>
        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
          Tout ce que vous devez savoir
        </h2>
      </div>

      <div className="mt-12 space-y-3.5">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-xl border border-border bg-card px-5 transition-all open:shadow-sm open:border-primary/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-heading text-base font-medium text-foreground select-none">
              <span>{faq.question}</span>
              <Plus className="h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45" />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-muted-foreground border-t border-border/40 pt-3">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
