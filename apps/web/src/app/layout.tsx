import './globals.css'
import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import { AppProvider } from '@/providers/AppProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { I18nProvider } from '@/providers/I18nProvider'
import { DesignThemeProvider } from '@/providers/DesignThemeProvider'
import { GoogleAnalytics } from '@next/third-parties/google'
export const metadata: Metadata = {
  // ── Core ──────────────────────────────────────────────────────────────
  title: {
    default: 'Sales Companion 2.0 — Base de Données Entreprises Cameroun | Annuaire B2B N°1',
    template: '%s | Sales Companion 2.0'
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
    'Sales Companion 2.0'
  ],
  authors: [{ name: 'Sales Companion 2.0' }],
  creator: 'Sales Companion 2.0',

  // ── Canonical & robots ────────────────────────────────────────────────
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://salescompanion2-0.com'),
  alternates: {
    canonical: '/'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large'
    }
  },

  // ── PWA / Icons ───────────────────────────────────────────────────────
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png'
  },

  // ── Open Graph ────────────────────────────────────────────────────────
  openGraph: {
    title: 'Sales Companion 2.0 — Base de Données Entreprises Cameroun',
    description:
      'Accédez à la base de données la plus complète des entreprises camerounaises. 50 000+ sociétés vérifiées.',
    url: '/',
    siteName: 'Sales Companion 2.0',
    locale: 'fr_CM',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sales Companion 2.0 — Annuaire B2B Cameroun'
      }
    ]
  },

  // ── Twitter / X Card ─────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'Sales Companion 2.0 — Base de Données Entreprises Cameroun',
    description: 'La plateforme B2B de référence pour la prospection commerciale au Cameroun.',
    creator: '@SalesCompanion20',
    images: ['/og-image.png']
  }
}

export const viewport: Viewport = {
  themeColor: '#185FA5',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: 'cover'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sales Companion 2.0',
    description:
      "Plateforme d'intelligence commerciale et base de données entreprises au Cameroun.",
    url: 'https://salescompanion2-0.com',
    logo: 'https://salescompanion2-0.com/logo.png',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Douala',
      addressCountry: 'CM'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['French', 'English']
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://salescompanion2-0.com/search?query={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  }

  return (
    <html lang="fr-CM" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* ── No-flash design theme script — runs synchronously before first paint ── */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('sc-design-theme')||'linkedin';document.documentElement.setAttribute('data-design',d);}catch(e){}})();`
          }}
        />
      </head>
      <body>
        <DesignThemeProvider />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider>
            <AppProvider>{children}</AppProvider>
          </I18nProvider>
        </ThemeProvider>
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  )
}
