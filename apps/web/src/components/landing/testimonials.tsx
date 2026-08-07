const testimonials = [
  {
    quote:
      "Le mode manager change tout. Je vois le pipeline de toute mon équipe en temps réel et j'assigne les prospects directement depuis mon téléphone lors de mes déplacements.",
    name: "Thierry N.",
    role: "Directeur Commercial · Douala",
    initials: "TN"
  },
  {
    quote:
      "Je cible les PME technologiques et les cabinets de conseil en quelques filtres, puis je laisse le Companion IA rédiger mes premiers emails. Un vrai gain de temps au quotidien.",
    name: "Marcelle K.",
    role: "Commerciale Indépendante · Yaoundé",
    initials: "MK"
  }
]

export function Testimonials() {
  return (
    <section id="temoignages" className="border-y border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Témoignages</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
            Adopté par les commerciaux du terrain
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {testimonials.map((t) => (
            <figure key={t.name} className="flex flex-col justify-between rounded-2xl border border-border bg-card p-7 md:p-8 shadow-xs hover:border-primary/30 transition-colors">
              <blockquote className="font-heading text-base leading-relaxed text-foreground text-pretty italic">
                « {t.quote} »
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {t.initials}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
