'use client'

import Link from 'next/link'
import { routes } from '@/constants/routes'

const navLinks = [
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Tarifs', href: '#tarifs' },
  { label: 'Blog', href: '#blog' },
  { label: 'Témoignages', href: '#temoignages' },
  { label: 'FAQ', href: '#faq' }
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="Sales Companion 2.0, accueil">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-heading text-sm font-semibold text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
            SC
          </span>
          <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
            Sales Companion <span className="text-primary">2.0</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:translate-y-[-1px]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={routes.login}
            className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary sm:inline-flex"
          >
            Connexion
          </Link>
          <Link
            href={routes.register}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="sm:hidden">Essayer</span>
            <span className="hidden sm:inline">Commencer gratuitement</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
