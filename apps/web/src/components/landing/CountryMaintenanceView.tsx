'use client'

import Link from 'next/link'
import { PublicNav } from '@/components/landing/PublicNav'
import { PublicFooter } from '@/components/landing/PublicFooter'
import { COUNTRY_NAMES, type CountryCode } from '@sales-companion/shared'
import { useTranslation } from '@/providers/I18nProvider'

interface CountryMaintenanceViewProps {
  pageType: 'blog' | 'annuaire' | 'guide' | 'public'
  countryCode: CountryCode
  customTitle?: string
  customDescription?: string
}

export function CountryMaintenanceView({
  pageType,
  countryCode,
  customTitle,
  customDescription
}: CountryMaintenanceViewProps) {
  const { lang } = useTranslation()
  const isEn = lang === 'en'
  const countryName = COUNTRY_NAMES[countryCode] || countryCode

  const sectionLabel =
    pageType === 'blog'
      ? isEn
        ? 'The B2B Blog'
        : 'Le Blog B2B'
      : pageType === 'annuaire'
        ? isEn
          ? 'The B2B Directory'
          : "L'Annuaire B2B"
        : isEn
          ? 'This section'
          : 'Cette rubrique'

  const title =
    customTitle ?? (isEn ? `Coming soon for ${countryName}` : `Contenu en cours de déploiement`)

  const description =
    customDescription ??
    (isEn
      ? `${sectionLabel} for ${countryName} is currently being prepared and will be available very soon. You can already access the prospecting engine and CRM.`
      : `${sectionLabel} pour ${countryName} est actuellement en cours de finalisation et sera disponible très prochainement. En attendant, nos outils de prospection et CRM sont opérationnels.`)

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <PublicNav
        activePage={pageType === 'blog' ? 'blog' : undefined}
        backLink={{ href: '/', label: isEn ? 'Back to home' : "Retour à l'accueil" }}
      />
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <div className="text-5xl mb-4" role="img" aria-label="Maintenance">
          ⏳
        </div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3 tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md text-sm md:text-base leading-relaxed">
          {description}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-accent"
          >
            ← {isEn ? 'Back to home' : "Retour à l'accueil"}
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
          >
            {isEn ? 'Explore Companies' : 'Rechercher des prospects'} →
          </Link>
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
