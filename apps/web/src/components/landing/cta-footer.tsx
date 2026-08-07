'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck, Lock, Server, Smartphone } from 'lucide-react'
import { routes } from '@/constants/routes'

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
    { label: 'Support & Assistance', href: '/support' }
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
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15),transparent)]"
          />

          <h2 className="relative z-10 mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight text-primary-foreground text-balance sm:text-4xl">
            Prospectez plus vite au Cameroun
          </h2>
          <p className="relative z-10 mx-auto mt-4 max-w-xl leading-relaxed text-primary-foreground/90 text-pretty">
            Créez votre compte gratuitement et accédez dès aujourd&apos;hui à l&apos;annuaire B2B le
            plus complet du marché.
          </p>
          <div className="relative z-10 mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Link
              href={routes.register}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-card px-6 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-card/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
            <Link
              href={routes.register}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-foreground/30 bg-primary/20 px-5 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary-foreground/10"
            >
              <Smartphone className="h-4 w-4" />
              Installer sur mobile (PWA)
            </Link>
          </div>

          <ul className="relative z-10 mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-primary-foreground/20 pt-8">
            {trust.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-xs font-medium text-primary-foreground/90">
                <item.icon className="h-4 w-4 shrink-0" />
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
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-heading text-sm font-semibold text-primary-foreground shadow-xs">
                  SC
                </span>
                <span className="font-heading text-base font-semibold text-foreground">
                  Sales Companion <span className="text-primary">2.0</span>
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                La plateforme d&apos;intelligence commerciale B2B N°1 au Cameroun. 500K+ entreprises vérifiées à Douala, Yaoundé et régions.
              </p>
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

            {/* Legal Column */}
            <div>
              <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">Légal & Accès</h3>
              <ul className="mt-3 space-y-2 text-xs">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} Sales Companion 2.0. Tous droits réservés.</p>
            <p>Conçu pour les commerciaux et directeurs de vente au Cameroun 🇨🇲</p>
          </div>
        </div>
      </footer>
    </>
  )
}
