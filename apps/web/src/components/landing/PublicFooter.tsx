import Link from 'next/link'
import { ScIcon } from '@/components/ui/ScIcon'
import { routes } from '@/constants/routes'

const footerLinks = {
  ressources: [
    { label: 'Blog B2B Cameroun', href: '/blog' },
    { label: 'Annuaire entreprises', href: '/annuaire' },
    { label: 'Entreprises à Douala', href: '/annuaire/douala' },
    { label: 'Entreprises BTP', href: '/annuaire/btp' },
    {
      label: 'Guide NIU & RCCM',
      href: '/blog/niu-rccm-identifier-entreprise-camerounaise'
    },
    {
      label: 'Base de données Cameroun',
      href: '/blog/base-de-donnees-entreprises-cameroun-2026'
    }
  ],
  produit: [
    { label: 'Commencer gratuitement', href: routes.register },
    { label: 'Se connecter', href: routes.login },
    { label: 'Fonctionnalités', href: '/#fonctionnalites' },
    { label: 'Tarifs', href: '/#tarifs' }
  ],
  legal: [
    { label: 'Conditions Générales', href: '/terms' },
    { label: 'Confidentialité', href: '/privacy' }
  ]
}

export function PublicFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-5 py-12">
        {/* Top : brand + colonnes */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 group w-fit"
              aria-label="Sales Companion 2.0"
            >
              <ScIcon size={30} interactive className="group-hover:scale-105 transition-transform" />
              <span className="font-heading text-[14px] font-semibold tracking-tight text-foreground">
                Sales Companion{' '}
                <span className="text-[#1B7A3E]">2.0</span>
              </span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground max-w-[220px]">
              La plateforme B2B de référence pour prospecter et gérer vos ventes au Cameroun.
            </p>
          </div>

          {/* Ressources */}
          <div>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ressources
            </h3>
            <ul className="space-y-2">
              {footerLinks.ressources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground transition-colors hover:text-[#1B7A3E]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Produit */}
          <div>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Produit
            </h3>
            <ul className="space-y-2">
              {footerLinks.produit.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground transition-colors hover:text-[#1B7A3E]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Légal
            </h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground transition-colors hover:text-[#1B7A3E]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {year} Sales Companion 2.0 · Base de données entreprises Cameroun
          </p>
          <a
            href="https://www.linkedin.com/company/sales-companion-2-0/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-[#0A66C2] hover:text-[#0A66C2]"
            aria-label="Page LinkedIn Sales Companion 2.0"
          >
            <svg className="h-3.5 w-3.5 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  )
}
