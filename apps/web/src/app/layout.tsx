import './globals.css'
import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import { AppProvider } from '@/providers/AppProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { I18nProvider } from '@/providers/I18nProvider'
import { GoogleAnalytics } from '@next/third-parties/google'
export const metadata: Metadata = {
  // ── Core ──────────────────────────────────────────────────────────────
  title: {
    default: 'Sales Companion 2.0 — Intelligence B2B Cameroun',
    template: '%s | Sales Companion 2.0',
  },
  description:
    'La plateforme B2B dédiée aux commerciaux et managers au Cameroun. Recherchez des entreprises, gérez votre pipeline commercial et boostez vos performances de vente.',
  keywords: [
    'CRM Cameroun',
    'pipeline commercial',
    'prospection B2B',
    'gestion équipe commerciale',
    'intelligence commerciale Cameroun',
    'logiciel commercial Cameroun',
    'Sales Companion 2.0',
  ],
  authors: [{ name: 'Sales Companion 2.0' }],
  creator: 'Sales Companion 2.0',

  // ── Canonical & robots ────────────────────────────────────────────────
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://sales-companion.app'
  ),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },

  // ── PWA / Icons ───────────────────────────────────────────────────────
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },

  // ── Open Graph ────────────────────────────────────────────────────────
  openGraph: {
    title: 'Sales Companion 2.0 — Intelligence B2B Cameroun',
    description:
      'Recherchez des entreprises, gérez votre pipeline et boostez vos performances commerciales au Cameroun.',
    url: '/',
    siteName: 'Sales Companion 2.0',
    locale: 'fr_FR',
    type: 'website',
  },

  // ── Twitter / X Card ─────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'Sales Companion 2.0 — Intelligence B2B Cameroun',
    description:
      'La plateforme commerciale B2B dédiée aux équipes de vente au Cameroun.',
    creator: '@SalesCompanion',
  },
}

export const viewport: Viewport = {
  themeColor: '#1B7A3E',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider>
            <AppProvider>{children}</AppProvider>
          </I18nProvider>
        </ThemeProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  )
}
