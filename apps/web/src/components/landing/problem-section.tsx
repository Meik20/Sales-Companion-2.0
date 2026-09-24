'use client'

import { FileSpreadsheet, SearchX, Clock, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'
import { useLandingCountry } from '@/features/landing/landing-country'

export function ProblemSection() {
  const { lang } = useTranslation()
  const { country } = useLandingCountry()
  const isEn = lang === 'en'

  const problems = [
    {
      icon: SearchX,
      title: isEn ? 'Scattered & fragmented data' : 'Données dispersées',
      desc: isEn
        ? 'Finding the right companies often requires searching across outdated online directories, social posts, and word-of-mouth.'
        : 'Trouver les bonnes entreprises demande souvent de consulter plusieurs sources incomplètes, annuaires papier ou bouche-à-oreille.'
    },
    {
      icon: Clock,
      title: isEn ? 'Tedious & inaccurate targeting' : 'Ciblage difficile',
      desc: isEn
        ? 'Without structured data, sales reps waste valuable hours chasing wrong numbers, closed businesses, or non-decision makers.'
        : 'Sans données structurées, les commerciaux perdent un temps précieux sur des numéros erronés ou des prospects hors cible.'
    },
    {
      icon: FileSpreadsheet,
      title: isEn ? 'Disorganized follow-up' : 'Suivi compliqué sur Excel',
      desc: isEn
        ? 'Prospects, call logs, and follow-up reminders get lost across Excel sheets, physical notebooks, and personal WhatsApp threads.'
        : 'Les prospects, notes de visites et relances finissent éparpillés entre fichiers Excel, calepins et fils WhatsApp non partagés.'
    }
  ]

  return (
    <section className="relative py-16 md:py-24 bg-background">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500">
            {isEn ? 'The Common Challenge' : 'Le constat terrain'}
          </span>
          <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl text-balance">
            {isEn
              ? 'B2B sales prospecting shouldn’t start with an Excel spreadsheet.'
              : 'La prospection B2B ne devrait pas commencer par un fichier Excel.'}
          </h2>
          <p className="mt-4 text-base text-muted-foreground text-pretty">
            {isEn
              ? `Sales teams in ${country.name} often lose valuable prospecting time because tools are fragmented and unsuited to the local market.`
              : `${country.frenchIn.charAt(0).toUpperCase() + country.frenchIn.slice(1)}, les équipes commerciales perdent souvent du temps de prospection à cause d’outils inadaptés et dispersés.`}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {problems.map((prob) => (
            <div
              key={prob.title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-xs transition-all hover:border-rose-500/30 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 mb-4">
                <prob.icon className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                {prob.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {prob.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Transition banner to Sales Companion 2.0 */}
        <div className="mt-12 rounded-2xl border border-[#1B7A3E]/30 bg-[#1B7A3E]/5 p-6 text-center sm:p-8">
          <p className="font-heading text-lg font-bold text-foreground sm:text-xl">
            {isEn ? (
              <>
                Sales Companion 2.0 brings all these steps together into{' '}
                <span className="text-[#1B7A3E]">one unified workspace.</span>
              </>
            ) : (
              <>
                Sales Companion 2.0 rassemble toutes ces étapes dans{' '}
                <span className="text-[#1B7A3E]">un seul espace unifié.</span>
              </>
            )}
          </p>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            {isEn
              ? 'Find qualified businesses, verify decision-makers, and organize follow-ups in an intuitive CRM designed for our market.'
              : `Identifiez les bonnes entreprises, préparez vos approches et suivez vos relances dans un outil pensé pour le terrain ${country.frenchIn}.`}
          </p>
        </div>
      </div>
    </section>
  )
}
