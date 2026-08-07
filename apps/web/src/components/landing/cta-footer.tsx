'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck, Lock, Server, Smartphone } from 'lucide-react'
import { routes } from '@/constants/routes'

const trust = [
  { icon: Lock, label: 'Chiffré en transit (HTTPS/TLS 1.3)' },
  { icon: ShieldCheck, label: 'Zéro revente de vos données' },
  { icon: Server, label: 'Hébergement certifié et sécurisé' }
]

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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-heading text-xs font-semibold text-primary-foreground shadow-xs">
              SC
            </span>
            <span className="font-heading text-sm font-semibold text-foreground">
              Sales Companion <span className="text-primary">2.0</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            La plateforme B2B des commerciaux camerounais.
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sales Companion 2.0. Tous droits réservés.
          </p>
        </div>
      </footer>
    </>
  )
}
