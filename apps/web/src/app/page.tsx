import { Metadata } from 'next'
import { HomeClient } from './HomeClient'

export const metadata: Metadata = {
  title: 'Sales Companion | Prospectez plus vite, Vendez mieux',
  description: 'Le premier outil d\'intelligence commerciale et de prospection B2B au Cameroun. Trouvez vos prospects idéaux et gérez votre pipeline commercial facilement.',
}

export default function Home() {
  // Schema.org Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Sales Companion',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'XAF',
    },
    description: 'Plateforme B2B dédiée aux commerciaux et managers au Cameroun pour la prospection et la gestion de pipeline.',
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
