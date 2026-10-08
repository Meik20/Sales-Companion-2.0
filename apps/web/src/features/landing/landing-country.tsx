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
    neighborhoods: 'Akwa, Bastos, Bonanjo...'
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
    neighborhoods: 'Plateau, Almadies, Point E...'
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
    neighborhoods: 'Plateau, Cocody, Marcory...'
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
    neighborhoods: 'Haie Vive, Ganhi, Cadjèhoun...'
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
    neighborhoods: 'Assivito, Décon, Tokoin...'
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
    neighborhoods: 'Kabalaye, Chagoua, Moursal...'
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
    neighborhoods: 'Centre-Ville, Lakouanga, Sica...'
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
    neighborhoods: details.neighborhoods
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