'use client'

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import {
  COUNTRY_ENGLISH_ADJECTIVE,
  COUNTRY_ENGLISH_FOR,
  COUNTRY_ENGLISH_IN,
  COUNTRY_ENGLISH_MARKET,
  COUNTRY_FRENCH_ADJECTIVE,
  COUNTRY_FRENCH_IN,
  COUNTRY_FRENCH_MARKET_ADJECTIVE,
  COUNTRY_NAMES,
  COUNTRY_NAMES_EN,
  SUPPORTED_COUNTRIES,
  type CountryCode
} from '@sales-companion/shared'
import { useTranslation } from '@/providers/I18nProvider'

const COUNTRY_COOKIE = 'sc_country'

export type LandingTestimonial = {
  name: string
  initials: string
  city: string
  quoteFr: string
  quoteEn: string
}

export type LandingCountry = {
  code: CountryCode
  name: string
  nameEn: string
  nameFr: string
  frenchIn: string
  frenchAdjective: string
  frenchMarketAdjective: string
  englishIn: string
  englishFor: string
  englishMarket: string
  englishAdjective: string
  flag: string
  currency: string
  cities: string[]
  regions: number
  companyCount: string
  area: string
  taxLabel: string
  taxExample: string
  rccmExample: string
  mockPhone: string
  kanbanContacted: string
  kanbanTech: string
  neighborhoods: string
  testimonials: LandingTestimonial[]
}

export type LandingCountryItem = {
  code: CountryCode
  name: string
  nameEn: string
  nameFr: string
  flag: string
  dialCode: string
  examplePhone: string
}

const COUNTRY_DETAILS: Record<CountryCode, {
  currency: string
  cities: string[]
  regions: number
  companyCountFr: string
  companyCountEn: string
  area: string
  taxLabel: string
  taxExample: string
  rccmExample: string
  mockPhone: string
  kanbanContacted: string
  kanbanTech: string
  neighborhoods: string
  testimonials: LandingTestimonial[]
}> = {
  CM: {
    currency: 'XAF',
    cities: ['Douala', 'Yaoundé', 'Bafoussam'],
    regions: 10,
    companyCountFr: '50 000+',
    companyCountEn: '50,000+',
    area: 'Bonanjo',
    taxLabel: 'NIU',
    taxExample: 'M051912783451A',
    rccmExample: 'RC/DLA/2021/B/1420',
    mockPhone: '+237 670 12 34 56',
    kanbanContacted: 'SABC SA',
    kanbanTech: 'TechCam',
    neighborhoods: 'Akwa, Bastos, Bonanjo...',
    testimonials: [
      {
        name: 'Thierry N.',
        initials: 'TN',
        city: 'Douala',
        quoteFr: 'En deux semaines, j\'ai trouvé plus de prospects qualifiés qu\'en trois mois avec mes anciennes méthodes. La base camerounaise est très complète.',
        quoteEn: 'In two weeks I found more qualified leads than in three months with my old methods. The Cameroonian database is very thorough.'
      },
      {
        name: 'Marcelle K.',
        initials: 'MK',
        city: 'Yaoundé',
        quoteFr: 'Je gère mon pipeline depuis mon téléphone, même en déplacement à Bafoussam. Sales Companion a vraiment changé ma façon de prospecter.',
        quoteEn: 'I manage my pipeline from my phone, even when travelling to Bafoussam. Sales Companion has truly changed the way I prospect.'
      }
    ]
  },
  SN: {
    currency: 'XOF',
    cities: ['Dakar', 'Thiès', 'Saint-Louis'],
    regions: 14,
    companyCountFr: 'Base en expansion',
    companyCountEn: 'Rapidly growing database',
    area: 'Almadies',
    taxLabel: 'NINEA',
    taxExample: '004875212 2G3',
    rccmExample: 'SN-DKR-2021-B-1420',
    mockPhone: '+221 77 123 45 67',
    kanbanContacted: 'SOBOA SA',
    kanbanTech: 'SenTech',
    neighborhoods: 'Plateau, Almadies, Point E...',
    testimonials: [
      {
        name: 'Ousmane D.',
        initials: 'OD',
        city: 'Dakar',
        quoteFr: 'Avec Sales Companion, j\'ai structuré ma prospection sur Dakar en quelques jours. Un outil indispensable pour les commerciaux sénégalais.',
        quoteEn: 'With Sales Companion I structured my Dakar prospecting in just a few days. An essential tool for Senegalese sales reps.'
      },
      {
        name: 'Aminata S.',
        initials: 'AS',
        city: 'Thiès',
        quoteFr: 'La plateforme m\'a permis de cibler les bonnes entreprises à Thiès sans perdre de temps. Mon taux de conversion a doublé.',
        quoteEn: 'The platform let me target the right companies in Thiès without wasting time. My conversion rate has doubled.'
      }
    ]
  },
  CI: {
    currency: 'XOF',
    cities: ['Abidjan', 'Bouaké', 'Yamoussoukro'],
    regions: 14,
    companyCountFr: 'Base en expansion',
    companyCountEn: 'Rapidly growing database',
    area: 'Plateau',
    taxLabel: 'NCC',
    taxExample: '2104589 A',
    rccmExample: 'CI-ABJ-2021-B-1420',
    mockPhone: '+225 07 08 12 34 56',
    kanbanContacted: 'SOLIBRA',
    kanbanTech: 'IvoireTech',
    neighborhoods: 'Plateau, Cocody, Marcory...',
    testimonials: [
      {
        name: 'Konan A.',
        initials: 'KA',
        city: 'Abidjan',
        quoteFr: 'En Côte d\'Ivoire, trouver les bons interlocuteurs prend du temps. Sales Companion m\'a donné accès aux bonnes entreprises dès le premier jour.',
        quoteEn: 'In Côte d\'Ivoire, finding the right contacts takes time. Sales Companion gave me access to the right companies from day one.'
      },
      {
        name: 'Bintou T.',
        initials: 'BT',
        city: 'Bouaké',
        quoteFr: 'Je prospecte depuis Bouaké avec une efficacité que je n\'avais jamais eue auparavant. L\'interface est claire et les données sont fiables.',
        quoteEn: 'I prospect from Bouaké with an efficiency I never had before. The interface is clear and the data is reliable.'
      }
    ]
  },
  BJ: {
    currency: 'XOF',
    cities: ['Cotonou', 'Porto-Novo', 'Parakou'],
    regions: 12,
    companyCountFr: 'Base en expansion',
    companyCountEn: 'Rapidly growing database',
    area: 'Haie Vive',
    taxLabel: 'IFU',
    taxExample: '3202011485698',
    rccmExample: 'RB-COT-2021-B-1420',
    mockPhone: '+229 97 12 34 56',
    kanbanContacted: 'SOBEBRA',
    kanbanTech: 'BeninTech',
    neighborhoods: 'Haie Vive, Ganhi, Cadjèhoun...',
    testimonials: [
      {
        name: 'Rodrigue A.',
        initials: 'RA',
        city: 'Cotonou',
        quoteFr: 'Sales Companion m\'a permis de structurer mes relances et de ne plus manquer aucune opportunité à Cotonou. Un gain de temps énorme.',
        quoteEn: 'Sales Companion let me structure my follow-ups and never miss an opportunity in Cotonou. A huge time saver.'
      },
      {
        name: 'Fatoumata M.',
        initials: 'FM',
        city: 'Porto-Novo',
        quoteFr: 'La base de données béninoise est très bien renseignée. Je recommande Sales Companion à tous les commerciaux de terrain.',
        quoteEn: 'The Beninese database is very well populated. I recommend Sales Companion to every field sales rep.'
      }
    ]
  },
  TG: {
    currency: 'XOF',
    cities: ['Lomé', 'Sokodé', 'Kara'],
    regions: 5,
    companyCountFr: 'Base en expansion',
    companyCountEn: 'Rapidly growing database',
    area: 'Assivito',
    taxLabel: 'NIF',
    taxExample: '1001458962',
    rccmExample: 'TG-LOM-2021-B-1420',
    mockPhone: '+228 90 12 34 56',
    kanbanContacted: 'BB Lomé',
    kanbanTech: 'TogoTech',
    neighborhoods: 'Assivito, Décon, Tokoin...',
    testimonials: [
      {
        name: 'Komi A.',
        initials: 'KA',
        city: 'Lomé',
        quoteFr: 'Grâce à Sales Companion, j\'ai pu cartographier rapidement le tissu entrepreneurial de Lomé et identifier mes cibles prioritaires.',
        quoteEn: 'Thanks to Sales Companion I quickly mapped Lomé\'s business landscape and identified my priority targets.'
      },
      {
        name: 'Afi M.',
        initials: 'AM',
        city: 'Kara',
        quoteFr: 'Un outil pensé pour l\'Afrique. Les données sont locales, les filtres sont pertinents et l\'interface est intuitive.',
        quoteEn: 'A tool designed for Africa. The data is local, the filters are relevant and the interface is intuitive.'
      }
    ]
  },
  TD: {
    currency: 'XAF',
    cities: ["N'Djaména", 'Moundou', 'Sarh'],
    regions: 18,
    companyCountFr: 'Base en expansion',
    companyCountEn: 'Rapidly growing database',
    area: 'Chagoua',
    taxLabel: 'NIF',
    taxExample: '18045678',
    rccmExample: 'TD-NDJ-2021-B-1420',
    mockPhone: '+235 66 12 34 56',
    kanbanContacted: 'BDT SA',
    kanbanTech: 'TchadTech',
    neighborhoods: 'Kabalaye, Chagoua, Moursal...',
    testimonials: [
      {
        name: 'Ibrahim H.',
        initials: 'IH',
        city: "N'Djaména",
        quoteFr: 'Sales Companion m\'a donné une vision claire du marché tchadien. Je prospecte maintenant avec méthode et confiance.',
        quoteEn: 'Sales Companion gave me a clear picture of the Chadian market. I now prospect with method and confidence.'
      },
      {
        name: 'Halimé S.',
        initials: 'HS',
        city: 'Moundou',
        quoteFr: 'Je n\'aurais pas pensé qu\'un outil comme celui-ci pourrait exister pour notre marché. Les données sont précises et utiles.',
        quoteEn: 'I would not have thought a tool like this could exist for our market. The data is accurate and useful.'
      }
    ]
  },
  CF: {
    currency: 'XAF',
    cities: ['Bangui', 'Bimbo', 'Berbérati'],
    regions: 16,
    companyCountFr: 'Base en expansion',
    companyCountEn: 'Rapidly growing database',
    area: 'Centre-Ville',
    taxLabel: 'NIF',
    taxExample: 'CF0014589',
    rccmExample: 'CF-BGF-2021-B-1420',
    mockPhone: '+236 75 12 34 56',
    kanbanContacted: 'MOCAF SA',
    kanbanTech: 'CentrafTech',
    neighborhoods: 'Centre-Ville, Lakouanga, Sica...',
    testimonials: [
      {
        name: 'Sylvain N.',
        initials: 'SN',
        city: 'Bangui',
        quoteFr: 'Pour la Centrafrique, c\'est une première. Sales Companion m\'a permis d\'avoir une base structurée pour mon activité commerciale à Bangui.',
        quoteEn: 'For the Central African Republic, this is a first. Sales Companion gave me a structured database for my sales activity in Bangui.'
      },
      {
        name: 'Marie-Claire B.',
        initials: 'MB',
        city: 'Bimbo',
        quoteFr: 'L\'outil est simple, les filtres sont efficaces et les résultats sont concrets. Je le recommande à tous mes collègues.',
        quoteEn: 'The tool is simple, the filters are effective and the results are concrete. I recommend it to all my colleagues.'
      }
    ]
  }
}

function readCountryCookie(): CountryCode | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)sc_country=([^;]+)/)
  const value = match?.[1]?.toUpperCase() as CountryCode | undefined
  return value && COUNTRY_NAMES[value] ? value : null
}

function buildLandingCountry(code: CountryCode, isEn: boolean): LandingCountry {
  const country = SUPPORTED_COUNTRIES.find((item) => item.code === code) ?? SUPPORTED_COUNTRIES[0]!
  const nameEn = country.nameEn
  const nameFr = country.name
  const details = COUNTRY_DETAILS[code]
  return {
    code,
    name: isEn ? nameEn : nameFr,
    nameEn,
    nameFr,
    flag: country.flag,
    currency: details.currency,
    cities: details.cities,
    regions: details.regions,
    companyCount: isEn ? details.companyCountEn : details.companyCountFr,
    frenchIn: COUNTRY_FRENCH_IN[code],
    frenchAdjective: COUNTRY_FRENCH_ADJECTIVE[code],
    frenchMarketAdjective: COUNTRY_FRENCH_MARKET_ADJECTIVE[code],
    englishIn: COUNTRY_ENGLISH_IN[code] ?? `in ${nameEn}`,
    englishFor: COUNTRY_ENGLISH_FOR[code] ?? `for ${nameEn}`,
    englishMarket: COUNTRY_ENGLISH_MARKET[code] ?? `the ${nameEn} market`,
    englishAdjective: COUNTRY_ENGLISH_ADJECTIVE[code] ?? nameEn,
    area: details.area,
    taxLabel: details.taxLabel,
    taxExample: details.taxExample,
    rccmExample: details.rccmExample,
    mockPhone: details.mockPhone,
    kanbanContacted: details.kanbanContacted,
    kanbanTech: details.kanbanTech,
    neighborhoods: details.neighborhoods,
    testimonials: details.testimonials
  }
}

type LandingCountryContextValue = {
  country: LandingCountry
  setCountry: (code: CountryCode) => void
  countries: LandingCountryItem[]
}

const LandingCountryContext = createContext<LandingCountryContextValue | null>(null)

export function LandingCountryProvider({ children }: { children: ReactNode }) {
  const { lang } = useTranslation()
  const isEn = lang === 'en'
  const [countryCode, setCountryCode] = useState<CountryCode>(() => readCountryCookie() ?? 'CM')

  useEffect(() => {
    if (readCountryCookie()) return

    fetch('/api/geo/country', { cache: 'no-store' })
      .then((response) => response.json() as Promise<{ country?: CountryCode }>)
      .then((data) => {
        if (data.country && COUNTRY_NAMES[data.country]) {
          setCountryCode(data.country)
          document.cookie = `${COUNTRY_COOKIE}=${data.country}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
        }
      })
      .catch(() => {})
  }, [])

  const value = useMemo(() => {
    const localizedCountries: LandingCountryItem[] = SUPPORTED_COUNTRIES.map((c) => ({
      code: c.code,
      name: isEn ? c.nameEn : c.name,
      nameEn: c.nameEn,
      nameFr: c.name,
      flag: c.flag,
      dialCode: c.dialCode,
      examplePhone: c.examplePhone
    }))

    return {
      country: buildLandingCountry(countryCode, isEn),
      countries: localizedCountries,
      setCountry: (code: CountryCode) => {
        setCountryCode(code)
        document.cookie = `${COUNTRY_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
      }
    }
  }, [countryCode, isEn])

  return <LandingCountryContext.Provider value={value}>{children}</LandingCountryContext.Provider>
}

export function useLandingCountry() {
  const context = useContext(LandingCountryContext)
  if (!context) throw new Error('useLandingCountry must be used inside LandingCountryProvider')
  return context
}