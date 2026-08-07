'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Smartphone, MapPin, Building2, Check, Sparkles } from 'lucide-react'
import { routes } from '@/constants/routes'

const results = [
  { name: 'Tech Yaoundé SARL', sector: 'Technologie', city: 'Yaoundé' },
  { name: 'BTP Douala Group', sector: 'BTP & Construction', city: 'Douala' },
  { name: 'Agro Littoral SA', sector: 'Agroalimentaire', city: 'Douala' }
]

const searchPhrases = [
  'Technologie · Yaoundé',
  'BTP & Construction · Douala',
  'Agroalimentaire · Bafoussam',
  'Services B2B · Garoua'
]

export function Hero() {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Effet machine à écrire automatique pour la barre de recherche du Hero
  useEffect(() => {
    const currentFullText = searchPhrases[phraseIndex] ?? searchPhrases[0] ?? ''
    const speed = isDeleting ? 40 : 80

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(currentFullText.slice(0, displayText.length + 1))
        if (displayText.length === currentFullText.length) {
          setTimeout(() => setIsDeleting(true), 2200)
        }
      } else {
        setDisplayText(currentFullText.slice(0, displayText.length - 1))
        if (displayText.length === 0) {
          setIsDeleting(false)
          setPhraseIndex((prev) => (prev + 1) % searchPhrases.length)
        }
      }
    }, speed)

    return () => clearTimeout(timer)
  }, [displayText, isDeleting, phraseIndex])

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      {/* Background glow animated */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_-10%,color-mix(in_oklch,var(--primary)_15%,transparent),transparent)] animate-pulse-glow"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col items-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-sm hover:border-primary/40 transition-colors">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            Intelligence B2B Cameroun
          </span>

          <h1 className="mt-5 font-heading text-4xl font-semibold leading-[1.08] tracking-tight text-foreground text-balance sm:text-5xl lg:text-6xl">
            La base de données des entreprises <span className="text-primary">camerounaises</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
            Sales Companion 2.0 centralise l&apos;annuaire des entreprises camerounaises, votre
            pipeline CRM et la gestion d&apos;équipe dans un seul outil, accessible partout — même
            hors-ligne.
          </p>

          <div className="mt-8 flex flex-col gap-3.5 w-full sm:w-auto sm:flex-row">
            <Link
              href={routes.register}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#pwa-install"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-secondary hover:border-primary/30"
            >
              <Smartphone className="h-4 w-4 text-primary" />
              Installer sur votre téléphone
            </a>
          </div>

          <dl className="mt-10 grid w-full max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
            {[
              { value: '500K+', label: 'entreprises indexées' },
              { value: '10', label: 'régions couvertes' },
              { value: 'PWA', label: '100% hors-ligne' }
            ].map((stat) => (
              <div key={stat.label} className="group">
                <dt className="font-heading text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {stat.value}
                </dt>
                <dd className="mt-1 text-xs leading-snug text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Demo Interface Card */}
        <div className="relative">
          <div className="rounded-2xl border border-border bg-card p-2.5 shadow-xl shadow-primary/5 transition-transform hover:shadow-primary/10">
            <div className="flex items-center gap-1.5 px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <div className="ml-3 flex-1 rounded-md bg-secondary px-3 py-1 text-[11px] text-muted-foreground font-mono">
                app.salescompanion2-0.com
              </div>
            </div>

            <div className="rounded-xl bg-background p-4 border border-border/50">
              {/* Typewriter Search Bar */}
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-card px-3 py-2.5 text-sm text-foreground shadow-sm">
                <MapPin className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                <span className="font-medium text-foreground">
                  {displayText}
                  <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-ping opacity-75" />
                </span>
                <span className="ml-auto rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shrink-0 shadow-xs">
                  Rechercher
                </span>
              </div>

              <p className="mt-4 mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                47 entreprises vérifiées trouvées
              </p>
              <ul className="space-y-2">
                {results.map((r, idx) => (
                  <li
                    key={r.name}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-all hover:border-primary/30 hover:bg-secondary/40"
                    style={{ animationDelay: `${idx * 150}ms` }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{r.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.sector} · {r.city}
                      </span>
                    </span>
                    <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center gap-2 overflow-hidden pt-1">
                {['Prospection', 'Négociation', 'Gagné'].map((stage, i) => (
                  <span
                    key={stage}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                      i === 0
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : i === 1
                          ? 'bg-accent/25 text-accent-foreground border border-accent/30'
                          : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    }`}
                  >
                    {stage}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Floating AI Companion Badge */}
          <div className="absolute -bottom-5 -left-4 hidden max-w-[240px] rounded-xl border border-primary/30 bg-card/95 p-3.5 shadow-xl backdrop-blur-md sm:block animate-float">
            <p className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500/30" />
              Companion IA Pro
            </p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground italic">
              « Rédige un email de prise de contact adapté à la PME technologique à Yaoundé »
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
