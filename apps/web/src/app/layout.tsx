import './globals.css'
import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import { AppProvider } from '@/providers/AppProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { I18nProvider } from '@/providers/I18nProvider'

export const metadata: Metadata = {
  title: 'Sales Companion — B2B Intelligence Cameroun',
  description: 'La plateforme B2B dédiée aux commerciaux et managers camerounais. Recherchez des entreprises, gérez votre pipeline et boostez vos performances.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Sales Companion',
    description: 'Intelligence B2B Cameroun',
    type: 'website',
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
      </body>
    </html>
  )
}
