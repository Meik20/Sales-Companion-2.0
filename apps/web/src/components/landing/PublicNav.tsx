'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { ScIcon } from '@/components/ui/ScIcon'
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher'
import { routes } from '@/constants/routes'

interface PublicNavProps {
  /** Marque le lien actif dans la nav */
  activePage?: 'blog' | 'annuaire'
  /** Lien "Retour" affiché sur les pages articles */
  backLink?: { href: string; label: string }
}

const navLinks = [
  { label: 'Accueil', href: '/' },
  { label: 'Annuaire B2B', href: '/annuaire', id: 'annuaire' },
  { label: 'Blog', href: '/blog', id: 'blog' }
] as const

export function PublicNav({ activePage, backLink }: PublicNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-[100] border-b border-border/70 bg-background/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group shrink-0"
          aria-label="Sales Companion 2.0 — Accueil"
        >
          <ScIcon
            size={34}
            interactive
            className="group-hover:scale-105 transition-transform"
          />
          <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
            Sales Companion{' '}
            <span className="text-[#1B7A3E]">2.0</span>
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          {navLinks.map((link) => {
            const isActive = 'id' in link && link.id === activePage
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1B7A3E]/10 text-[#1B7A3E] font-semibold'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Actions droite */}
        <div className="flex items-center gap-2">
          {/* Lien retour (pages articles) */}
          {backLink && (
            <Link
              href={backLink.href}
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex items-center gap-1 mr-1"
            >
              ← {backLink.label}
            </Link>
          )}

          {/* Sélecteur de langue */}
          <LanguageSwitcher />

          {/* CTA Connexion */}
          <Link
            href={routes.login}
            className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary sm:inline-flex"
          >
            Connexion
          </Link>

          {/* CTA Essai Gratuit */}
          <Link
            href={routes.register}
            className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] sm:inline-flex"
          >
            Essai Gratuit
          </Link>

          {/* Toggle mobile */}
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
        <div className="border-t border-border bg-background px-5 pb-4 md:hidden">
          <nav className="mt-3 flex flex-col gap-1" aria-label="Navigation mobile">
            {navLinks.map((link) => {
              const isActive = 'id' in link && link.id === activePage
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#1B7A3E]/10 text-[#1B7A3E] font-semibold'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
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
              Essai Gratuit
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
