'use client'

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { COUNTRY_FRENCH_ADJECTIVE, COUNTRY_FRENCH_IN, COUNTRY_FRENCH_MARKET_ADJECTIVE, COUNTRY_NAMES, SUPPORTED_COUNTRIES, type CountryCode } from '@sales-companion/shared'

const COUNTRY_COOKIE = 'sc_country'

type LandingCountry = {
  code: CountryCode
  name: string
  frenchIn: string
  frenchAdjective: string
  frenchMarketAdjective: string
  flag: string
  currency: string
  cities: string[]
  regions: number
  companyCount: string
}

const COUNTRY_DETAILS: Record<CountryCode, Omit<LandingCountry, 'code' | 'name' | 'flag' | 'frenchIn' | 'frenchAdjective' | 'frenchMarketAdjective'>> = {
  CM: { currency: 'XAF', cities: ['Douala', 'Yaoundé', 'Bafoussam'], regions: 10, companyCount: '50 000+' },
  SN: { currency: 'XOF', cities: ['Dakar', 'Thiès', 'Saint-Louis'], regions: 14, companyCount: 'Base en expansion' },
  CI: { currency: 'XOF', cities: ['Abidjan', 'Bouaké', 'Yamoussoukro'], regions: 14, companyCount: 'Base en expansion' },
  BJ: { currency: 'XOF', cities: ['Cotonou', 'Porto-Novo', 'Parakou'], regions: 12, companyCount: 'Base en expansion' },
  TG: { currency: 'XOF', cities: ['Lomé', 'Sokodé', 'Kara'], regions: 5, companyCount: 'Base en expansion' },
  TD: { currency: 'XAF', cities: ["N'Djaména", 'Moundou', 'Sarh'], regions: 18, companyCount: 'Base en expansion' },
  CF: { currency: 'XAF', cities: ['Bangui', 'Bimbo', 'Berbérati'], regions: 16, companyCount: 'Base en expansion' }
}

function readCountryCookie(): CountryCode | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)sc_country=([^;]+)/)
  const value = match?.[1]?.toUpperCase() as CountryCode | undefined
  return value && COUNTRY_NAMES[value] ? value : null
}

function buildLandingCountry(code: CountryCode): LandingCountry {
  const country = SUPPORTED_COUNTRIES.find((item) => item.code === code) ?? SUPPORTED_COUNTRIES[0]
  return {
    code,
    name: country.name,
    flag: country.flag,
    ...COUNTRY_DETAILS[code],
    frenchIn: COUNTRY_FRENCH_IN[code],
    frenchAdjective: COUNTRY_FRENCH_ADJECTIVE[code],
    frenchMarketAdjective: COUNTRY_FRENCH_MARKET_ADJECTIVE[code]
  }
}

type LandingCountryContextValue = {
  country: LandingCountry
  setCountry: (code: CountryCode) => void
  countries: typeof SUPPORTED_COUNTRIES
}

const LandingCountryContext = createContext<LandingCountryContextValue | null>(null)

export function LandingCountryProvider({ children }: { children: ReactNode }) {
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

  const value = useMemo(() => ({
    country: buildLandingCountry(countryCode),
    countries: SUPPORTED_COUNTRIES,
    setCountry: (code: CountryCode) => {
      setCountryCode(code)
      document.cookie = `${COUNTRY_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    }
  }), [countryCode])

  return <LandingCountryContext.Provider value={value}>{children}</LandingCountryContext.Provider>
}

export function useLandingCountry() {
  const context = useContext(LandingCountryContext)
  if (!context) throw new Error('useLandingCountry must be used inside LandingCountryProvider')
  return context
}