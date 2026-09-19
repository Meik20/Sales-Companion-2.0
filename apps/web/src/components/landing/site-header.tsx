'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { ScIcon } from '@/components/ui/ScIcon'
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher'
import { routes } from '@/constants/routes'

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
)

const navLinks = [
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Tarifs', href: '#tarifs' },
  { label: 'Blog', href: '#blog' },
  { label: 'Témoignages', href: '#temoignages' },
  { label: 'FAQ', href: '#faq' }
]

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-[100] border-b border-border/70 bg-background/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0" aria-label="Sales Companion 2.0, accueil">
          <ScIcon size={34} interactive className="group-hover:scale-105 transition-transform" />
          <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
            Sales Companion <span className="text-[#1B7A3E]">2.0</span>
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

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Sélecteur de langue */}
          <LanguageSwitcher />

          <a
            href="https://www.linkedin.com/company/sales-companion-2-0/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-[#0A66C2] hover:text-[#0A66C2] sm:inline-flex"
            aria-label="Page Officielle LinkedIn Sales Companion 2.0"
          >
            <LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />
            <span>LinkedIn</span>
          </a>

          <Link
            href={routes.login}
            className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary sm:inline-flex"
          >
            Connexion
          </Link>

          <Link
            href={routes.register}
            className="inline-flex items-center rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="sm:hidden">Essayer</span>
            <span className="hidden sm:inline">Commencer gratuitement</span>
          </Link>

          {/* Toggle menu mobile */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary md:hidden"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-5 pb-5 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="mt-3 flex flex-col gap-1" aria-label="Navigation mobile">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-border">
            <Link
              href={routes.login}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              onClick={() => setMobileOpen(false)}
            >
              Connexion
            </Link>
            <Link
              href={routes.register}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={() => setMobileOpen(false)}
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
