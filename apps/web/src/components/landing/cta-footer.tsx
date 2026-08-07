'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck, Lock, Server, Smartphone } from 'lucide-react'
import { routes } from '@/constants/routes'

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
)

const trust = [
  { icon: Lock, label: 'Chiffré en transit (HTTPS/TLS 1.3)' },
  { icon: ShieldCheck, label: 'Zéro revente de vos données' },
  { icon: Server, label: 'Hébergement certifié ISO 27001' }
]

const footerLinks = {
  product: [
    { label: 'Annuaire B2B Cameroun', href: '#fonctionnalites' },
    { label: 'Pipeline Commercial CRM', href: '#fonctionnalites' },
    { label: 'Companion IA Pro', href: '#fonctionnalites' },
    { label: 'Application Mobile (PWA)', href: '#pwa-install' },
    { label: 'Tarifs & Abonnements', href: '#tarifs' }
  ],
  resources: [
    { label: 'Blog & Conseils Vente', href: '/blog' },
    { label: 'Guide NIU & RCCM', href: '/blog/niu-rccm-identifier-entreprise-camerounaise' },
    { label: 'Annuaire BTP Douala', href: '/blog/annuaire-entreprises-btp-douala' },
    { label: 'Prospection B2B 2026', href: '/blog/trouver-clients-b2b-cameroun-2026' }
  ],
  legal: [
    { label: 'Conditions Générales (CGU)', href: '/terms' },
    { label: 'Politique de Confidentialité', href: '/privacy' },
    { label: 'Se connecter', href: routes.login },
    { label: 'Créer un compte', href: routes.register },
    { label: 'Page Officielle LinkedIn', href: 'https://www.linkedin.com/company/sales-companion-2-0/', external: true }
  ]
}

export function CtaFooter() {
  return (
    <>
      <section id="pwa-install" className="mx-auto max-w-6xl px-5 pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-primary px-6 py-14 text-center md:px-12 md:py-20 shadow-xl">
          {/* Subtle background glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.2),transparent)]"
          />

          <h2 className="relative z-10 mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
            Prospectez plus vite au Cameroun
          </h2>
          <p className="relative z-10 mx-auto mt-4 max-w-xl text-base font-normal leading-relaxed text-white text-pretty">
            Créez votre compte gratuitement et accédez dès aujourd&apos;hui à l&apos;annuaire B2B le
            plus complet du marché.
          </p>
          <div className="relative z-10 mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Link
              href={routes.register}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-bold text-primary shadow-md transition-all hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
            <Link
              href={routes.register}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/20"
            >
              <Smartphone className="h-4 w-4 text-white" />
              Installer sur mobile (PWA)
            </Link>
          </div>

          <ul className="relative z-10 mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/25 pt-8">
            {trust.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-xs font-semibold text-white">
                <item.icon className="h-4 w-4 shrink-0 text-white" />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:gap-12">
            {/* Brand column */}
            <div className="sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-heading text-sm font-semibold text-white shadow-xs">
                  SC
                </span>
                <span className="font-heading text-base font-semibold text-foreground">
                  Sales Companion <span className="text-primary">2.0</span>
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                La plateforme d&apos;intelligence commerciale B2B N°1 au Cameroun. 500K+ entreprises vérifiées à Douala, Yaoundé et régions.
              </p>
              <div className="mt-4">
                <a
                  href="https://www.linkedin.com/company/sales-companion-2-0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-primary hover:text-white hover:border-primary"
                >
                  <LinkedInIcon className="h-4 w-4 text-[#0A66C2]" />
                  Suivez-nous sur LinkedIn
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">Produit</h3>
              <ul className="mt-3 space-y-2 text-xs">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">Ressources SEO</h3>
              <ul className="mt-3 space-y-2 text-xs">
                {footerLinks.resources.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Communauté Column */}
            <div>
              <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">Légal & Communauté</h3>
              <ul className="mt-3 space-y-2 text-xs">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary font-medium"
                      >
                        <LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} Sales Companion 2.0. Tous droits réservés.</p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/company/sales-companion-2-0/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-[#0A66C2] transition-colors"
                aria-label="LinkedIn Sales Companion 2.0"
              >
                <LinkedInIcon className="h-4 w-4" />
                <span>LinkedIn</span>
              </a>
              <span>·</span>
              <p>Conçu pour les commerciaux au Cameroun 🇨🇲</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
