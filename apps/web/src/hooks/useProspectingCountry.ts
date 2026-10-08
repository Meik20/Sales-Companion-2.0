'use client'

/**
 * useProspectingCountry & useProspectingCountryDetails
 *
 * Résout le pays de prospection actif selon la priorité suivante :
 *   1. Cookie `sc_country` — défini par le sélecteur de pays.
 *   2. `user.country`     — pays d'inscription stocké en Firestore (fallback).
 *   3. 'CM'               — valeur par défaut si aucune source n'est disponible.
 *
 * Applique l'attribut global `data-country` sur `<html>` pour les thèmes CSS contextuels.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  COUNTRY_BUSINESS_CULTURE,
  COUNTRY_CURRENCIES,
  COUNTRY_DIAL_CODES,
  COUNTRY_FLAGS,
  COUNTRY_NAMES,
  COUNTRY_NAMES_EN,
  COUNTRY_TAX_LABELS,
  COUNTRY_THEME_CONFIG,
  SUPPORTED_COUNTRIES,
  type CountryCode,
  type CountryThemeConfig
} from '@sales-companion/shared'
import { useCurrentUser } from '@/hooks/useCurrentUser'

const COUNTRY_COOKIE = 'sc_country'
const COUNTRY_CHANGE_EVENT = 'sc_country_changed'

function readCountryCookie(): CountryCode | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)sc_country=([^;]+)/)
  const value = match?.[1]?.toUpperCase() as CountryCode | undefined
  return value && COUNTRY_NAMES[value] ? value : null
}

export function setProspectingCountryCookie(countryCode: CountryCode) {
  if (typeof document === 'undefined') return
  if (!COUNTRY_NAMES[countryCode]) return
  document.cookie = `${COUNTRY_COOKIE}=${countryCode}; path=/; max-age=31536000; SameSite=Lax`
  document.documentElement.setAttribute('data-country', countryCode)
  window.dispatchEvent(new CustomEvent(COUNTRY_CHANGE_EVENT, { detail: countryCode }))
}

export function useProspectingCountry(): CountryCode {
  const { user } = useCurrentUser()
  const [cookieCountry, setCookieCountry] = useState<CountryCode | null>(null)

  useEffect(() => {
    setCookieCountry(readCountryCookie())

    const handleCountryChange = () => {
      setCookieCountry(readCountryCookie())
    }

    window.addEventListener(COUNTRY_CHANGE_EVENT, handleCountryChange)
    return () => window.removeEventListener(COUNTRY_CHANGE_EVENT, handleCountryChange)
  }, [])

  const resolvedCountry = useMemo<CountryCode>(() => {
    // Priorité 1 : cookie
    if (cookieCountry && COUNTRY_NAMES[cookieCountry]) return cookieCountry

    // Priorité 2 : pays du profil Firestore
    const fromProfile = user?.country?.toUpperCase() as CountryCode | undefined
    if (fromProfile && COUNTRY_NAMES[fromProfile]) return fromProfile

    // Fallback
    return 'CM'
  }, [cookieCountry, user?.country])

  // Sync data-country sur <html>
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-country', resolvedCountry)
    }
  }, [resolvedCountry])

  return resolvedCountry
}

export interface ProspectingCountryDetails {
  code: CountryCode
  name: string
  nameEn: string
  flag: string
  dialCode: string
  examplePhone: string
  currency: string
  taxLabel: string
  theme: CountryThemeConfig
  culture: {
    greeting: string
    businessStyle: string
    pitchHint: string
  }
  telecoms: string[]
  setCountry: (code: CountryCode) => void
}

export function useProspectingCountryDetails(): ProspectingCountryDetails {
  const code = useProspectingCountry()

  const countryDef = useMemo(
    () => SUPPORTED_COUNTRIES.find((c) => c.code === code) ?? SUPPORTED_COUNTRIES[0],
    [code]
  )

  const theme = useMemo(() => COUNTRY_THEME_CONFIG[code] ?? COUNTRY_THEME_CONFIG.CM, [code])

  const culture = useMemo(
    () => COUNTRY_BUSINESS_CULTURE[code] ?? COUNTRY_BUSINESS_CULTURE.CM,
    [code]
  )

  const setCountry = useCallback((newCode: CountryCode) => {
    setProspectingCountryCookie(newCode)
  }, [])

  return {
    code,
    name: COUNTRY_NAMES[code] ?? countryDef.name,
    nameEn: COUNTRY_NAMES_EN[code] ?? countryDef.nameEn,
    flag: COUNTRY_FLAGS[code] ?? countryDef.flag,
    dialCode: COUNTRY_DIAL_CODES[code] ?? countryDef.dialCode,
    examplePhone: countryDef.examplePhone,
    currency: COUNTRY_CURRENCIES[code] ?? 'XAF',
    taxLabel: COUNTRY_TAX_LABELS[code] ?? 'NIU',
    theme,
    culture,
    telecoms: theme.telecoms,
    setCountry
  }
}
