'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Play,
  Building2,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  KanbanSquare,
  Sparkles,
  Plus
} from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { routes } from '@/constants/routes'

export function Hero() {
  const { lang, t } = useTranslation()
  const isEn = lang === 'en'

  const [addedToPipeline, setAddedToPipeline] = useState(false)

  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
      {/* Dynamic background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_-10%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)] animate-pulse-glow"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left column: Text & Value Proposition */}
        <div className="flex flex-col items-start">

          {/* H1 */}
          <h1 className="mt-5 font-heading text-3xl font-extrabold leading-[1.12] tracking-tight text-foreground text-balance sm:text-4xl lg:text-5xl">
            {isEn ? (
              <>
                Find your next <span className="text-[#1B7A3E]">B2B clients</span> in Cameroon.
              </>
            ) : (
              <>
                Trouvez vos prochains <span className="text-[#1B7A3E]">clients B2B</span> au Cameroun.
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
            {isEn
              ? 'Search across 50,000+ companies, target prospects matching your business, and manage your sales pipeline from a single tool.'
              : 'Recherchez parmi plus de 50 000 entreprises, ciblez les prospects qui correspondent à votre activité et gérez votre pipeline commercial depuis un seul outil.'}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3.5 w-full sm:w-auto sm:flex-row">
            <Link
              href={routes.register}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              {t('landing.startFree') || (isEn ? 'Start for free' : 'Commencer gratuitement')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#fonctionnalites"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary hover:border-primary/40"
            >
              <Play className="h-4 w-4 text-primary fill-primary/20" />
              {isEn ? 'See how it works' : 'Voir comment ça marche'}
            </a>
          </div>

          {/* Reassurance text */}
          <p className="mt-3.5 text-xs text-muted-foreground flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-[#1B7A3E] shrink-0" />
            {isEn
              ? '10 free searches per month · No credit card required'
              : '10 recherches gratuites par mois · Sans carte bancaire'}
          </p>

          {/* Quick proof badges */}
          <div className="mt-8 flex flex-wrap items-center gap-2.5 border-t border-border/80 pt-6 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {isEn ? 'Included:' : 'Inclus :'}
            </span>
            {[
              isEn ? '50,000+ companies' : '50 000+ entreprises',
              isEn ? 'Advanced search' : 'Recherche avancée',
              isEn ? 'Sales pipeline' : 'Pipeline commercial',
              isEn ? 'Field mode (PWA)' : 'Mode terrain (PWA)'
            ].map((feature, i) => (
              <span
                key={feature}
                className="inline-flex items-center rounded-md border border-border/60 bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-foreground/85"
              >
                {feature}
                {i < 3 && <span className="ml-2 text-muted-foreground/50">·</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Right column: High-Fidelity Product Flow Mockup */}
        <div className="relative">
          {/* Main App Container */}
          <div className="rounded-2xl border border-border bg-card p-3 shadow-2xl shadow-primary/10 transition-all hover:shadow-primary/15">
            {/* Window control bar */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 mb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <div className="ml-3 flex-1 rounded-md bg-secondary/80 px-3 py-1 text-[11px] text-muted-foreground font-mono text-center sm:text-left">
                app.salescompanion2-0.com/search
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Step 1: Search Criteria simulation */}
              <div className="rounded-xl border border-border/70 bg-background/70 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    1. {isEn ? 'Search Filters' : 'Filtres de recherche'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-[#1B7A3E]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1B7A3E] animate-pulse" />
                    127 {isEn ? 'companies found' : 'entreprises trouvées'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                    <span className="block text-[10px] text-muted-foreground font-medium">
                      {isEn ? 'Sector' : 'Secteur'}
                    </span>
                    <span className="font-semibold text-primary truncate block">BTP</span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <span className="block text-[10px] text-muted-foreground font-medium">
                      {isEn ? 'City' : 'Ville'}
                    </span>
                    <span className="font-semibold text-foreground truncate block">Douala</span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <span className="block text-[10px] text-muted-foreground font-medium">
                      {isEn ? 'Area' : 'Zone'}
                    </span>
                    <span className="font-semibold text-foreground truncate block">Bonanjo</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Selected Company Details Card */}
              <div className="rounded-xl border-2 border-primary/30 bg-card p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-bold text-foreground">
                        ABC CONSTRUCTION SARL
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        BTP & Génie Civil · Douala, Bonanjo
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAddedToPipeline(true)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-xs shrink-0 ${
                      addedToPipeline
                        ? 'bg-blue-600 text-white cursor-default'
                        : 'bg-[#1B7A3E] text-white hover:bg-[#135A2E] hover:scale-105 active:scale-95'
                    }`}
                  >
                    {addedToPipeline ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isEn ? 'Added!' : 'Ajouté !'}
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        {isEn ? 'Add to pipeline' : 'Ajouter au pipeline'}
                      </>
                    )}
                  </button>
                </div>

                {/* Enriched legal & contact data */}
                <div className="mt-3.5 grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-border/60">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>RCCM: <strong className="text-foreground font-mono font-medium">RC/DLA/2019/B/1420</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>NIU: <strong className="text-foreground font-mono font-medium">M051912783451A</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="font-mono text-foreground font-medium">+237 699 45 28 XX</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="font-mono text-foreground truncate font-medium">contact@abc-btp.cm</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Mini-Pipeline Kanban */}
              <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <KanbanSquare className="h-3.5 w-3.5 text-primary" />
                    2. {isEn ? 'Commercial Pipeline' : 'Pipeline commercial'}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {isEn ? 'Real-time sync' : 'Synchronisé'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                  {/* Column 1: À contacter */}
                  <div className="rounded-lg border border-primary/40 bg-primary/10 p-2 text-center">
                    <span className="block font-bold text-primary truncate">
                      {isEn ? 'To Contact' : 'À contacter'}
                    </span>
                    <span className="mt-1 inline-block rounded bg-card px-1.5 py-0.5 font-semibold text-foreground shadow-2xs border border-primary/20 truncate max-w-full">
                      ABC BTP
                    </span>
                  </div>

                  {/* Column 2: Contacté */}
                  <div className="rounded-lg border border-border bg-card/60 p-2 text-center">
                    <span className="block font-medium text-muted-foreground truncate">
                      {isEn ? 'Contacted' : 'Contacté'}
                    </span>
                    <span className="mt-1 inline-block rounded bg-secondary/80 px-1.5 py-0.5 text-muted-foreground truncate max-w-full">
                      SABC SA
                    </span>
                  </div>

                  {/* Column 3: Relance */}
                  <div className="rounded-lg border border-border bg-card/60 p-2 text-center">
                    <span className="block font-medium text-muted-foreground truncate">
                      {isEn ? 'Follow-up' : 'Relance'}
                    </span>
                    <span className="mt-1 inline-block rounded bg-secondary/80 px-1.5 py-0.5 text-muted-foreground truncate max-w-full">
                      AfriLog
                    </span>
                  </div>

                  {/* Column 4: Opportunité */}
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 text-center">
                    <span className="block font-bold text-blue-600 truncate">
                      {isEn ? 'Opportunity' : 'Opportunité'}
                    </span>
                    <span className="mt-1 inline-block rounded bg-card px-1.5 py-0.5 font-bold text-blue-600 shadow-2xs border border-blue-500/20 truncate max-w-full">
                      TechCam
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Mobile Indicator */}
          <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-md sm:flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-[#1B7A3E]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                {isEn ? 'Field Mode (PWA)' : 'Mode Terrain (PWA)'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isEn ? 'Offline cache & fast visits' : 'Accès fluide même sans réseau'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
