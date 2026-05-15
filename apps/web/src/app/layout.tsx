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
    default: 'Sales Companion — Base de Données Entreprises Cameroun | Annuaire B2B N°1',
    template: '%s | Sales Companion',
  },
  description:
    'Accédez à la base de données la plus complète des entreprises camerounaises. 50 000+ sociétés vérifiées à Douala, Yaoundé et dans tout le Cameroun. Prospection B2B, contacts dirigeants.',
  keywords: [
    'base de données entreprises Cameroun',
    'annuaire entreprises Cameroun',
    'prospection B2B Cameroun',
    'liste entreprises Douala',
    'liste entreprises Yaoundé',
    'intelligence commerciale Cameroun',
    'annuaire professionnel Cameroun',
    'Sales Companion',
  ],
  authors: [{ name: 'Sales Companion' }],
  creator: 'Sales Companion',

  // ── Canonical & robots ────────────────────────────────────────────────
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://sales-companion.app'
  ),
  alternates: {
    canonical: '/',
    languages: {
      'fr-CM': '/fr',
      'en-CM': '/en',
    },
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
    title: 'Sales Companion — Base de Données Entreprises Cameroun',
    description:
      'Accédez à la base de données la plus complète des entreprises camerounaises. 50 000+ sociétés vérifiées.',
    url: '/',
    siteName: 'Sales Companion',
    locale: 'fr_CM',
    type: 'website',
  },

  // ── Twitter / X Card ─────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'Sales Companion — Base de Données Entreprises Cameroun',
    description:
      'La plateforme B2B de référence pour la prospection commerciale au Cameroun.',
    creator: '@SalesCompanion',
  },
}

export const viewport: Viewport = {
  themeColor: '#1B7A3E',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Sales Companion",
    "description": "Plateforme d'intelligence commerciale et base de données entreprises au Cameroun.",
    "url": "https://sales-companion.app",
    "logo": "https://sales-companion.app/logo.png",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Douala",
      "addressCountry": "CM"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": ["French", "English"]
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://sales-companion.app/search?query={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="fr-CM" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
