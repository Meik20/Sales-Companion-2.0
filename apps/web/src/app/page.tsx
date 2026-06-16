import { Metadata } from 'next'
import { HomeClient } from './HomeClient'

export const metadata: Metadata = {
  title: "Base de données d'entreprises au Cameroun | Sales Companion 2.0",
  description:
    "Accédez à la meilleure base de données d'entreprises au Cameroun. Trouvez vos prospects B2B idéaux, exportez vos contacts et gérez votre pipeline commercial avec Sales Companion 2.0."
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
      "La plateforme B2B de référence offrant la plus grande base de données d'entreprises au Cameroun. Conçue pour la prospection et la gestion de pipeline des commerciaux."
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
