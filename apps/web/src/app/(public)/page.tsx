import { Metadata } from 'next'
import { HomeClient } from './HomeClient'

export const metadata: Metadata = {
  title: "Base de données d'entreprises & prospection B2B au Cameroun | Sales Companion 2.0",
  description:
    "Trouvez des entreprises à prospecter au Cameroun, filtrez vos prospects et gérez votre pipeline commercial avec Sales Companion 2.0.",
  openGraph: {
    title: "Base de données d'entreprises & prospection B2B au Cameroun | Sales Companion 2.0",
    description:
      "Trouvez des entreprises à prospecter au Cameroun, filtrez vos prospects et gérez votre pipeline commercial avec Sales Companion 2.0.",
    type: 'website',
    locale: 'fr_CM',
    siteName: 'Sales Companion 2.0'
  },
  alternates: {
    canonical: 'https://salescompanion2-0.com'
  }
}

export default function Home() {
  // Schema.org Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Sales Companion 2.0',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '47'
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'XAF'
    },
    description:
      "La plateforme de prospection B2B conçue pour le marché camerounais. Recherchez parmi plus de 50 000 entreprises et suivez vos opportunités commerciales."
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  )
}
