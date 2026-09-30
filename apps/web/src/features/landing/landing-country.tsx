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
}> = {
  CM: { currency: 'XAF', cities: ['Douala', 'Yaoundé', 'Bafoussam'], regions: 10, companyCountFr: '50 000+', companyCountEn: '50,000+' },
  SN: { currency: 'XOF', cities: ['Dakar', 'Thiès', 'Saint-Louis'], regions: 14, companyCountFr: 'Base en expansion', companyCountEn: 'Rapidly growing database' },
  CI: { currency: 'XOF', cities: ['Abidjan', 'Bouaké', 'Yamoussoukro'], regions: 14, companyCountFr: 'Base en expansion', companyCountEn: 'Rapidly growing database' },
  BJ: { currency: 'XOF', cities: ['Cotonou', 'Porto-Novo', 'Parakou'], regions: 12, companyCountFr: 'Base en expansion', companyCountEn: 'Rapidly growing database' },
  TG: { currency: 'XOF', cities: ['Lomé', 'Sokodé', 'Kara'], regions: 5, companyCountFr: 'Base en expansion', companyCountEn: 'Rapidly growing database' },
  TD: { currency: 'XAF', cities: ["N'Djaména", 'Moundou', 'Sarh'], regions: 18, companyCountFr: 'Base en expansion', companyCountEn: 'Rapidly growing database' },
  CF: { currency: 'XAF', cities: ['Bangui', 'Bimbo', 'Berbérati'], regions: 16, companyCountFr: 'Base en expansion', companyCountEn: 'Rapidly growing database' }
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
    englishAdjective: COUNTRY_ENGLISH_ADJECTIVE[code] ?? nameEn
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