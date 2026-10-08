'use client'

/**
 * useProspectingCountry
 *
 * Résout le pays de prospection actif selon la priorité suivante :
 *   1. Cookie `sc_country` — défini par le sélecteur de pays sur la landing page.
 *   2. `user.country`     — pays d'inscription stocké en Firestore (fallback).
 *   3. 'CM'               — valeur par défaut si aucune source n'est disponible.
 *
 * Cela permet à un utilisateur inscrit au Cameroun de sélectionner
 * "Côte d'Ivoire" sur la landing page et de rechercher des entreprises
 * ivoiriennes après connexion, sans modifier son profil Firestore.
 */

import { useMemo } from 'react'
import { COUNTRY_NAMES, type CountryCode } from '@sales-companion/shared'
import { useCurrentUser } from '@/hooks/useCurrentUser'

const COUNTRY_COOKIE = 'sc_country'

function readCountryCookie(): CountryCode | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)sc_country=([^;]+)/)
  const value = match?.[1]?.toUpperCase() as CountryCode | undefined
  // Valider que le code est un pays supporté
  return value && COUNTRY_NAMES[value] ? value : null
}

export function useProspectingCountry(): CountryCode {
  const { user } = useCurrentUser()

  return useMemo<CountryCode>(() => {
    // Priorité 1 : cookie landing page
    const fromCookie = readCountryCookie()
    if (fromCookie) return fromCookie

    // Priorité 2 : pays du profil Firestore
    const fromProfile = user?.country?.toUpperCase() as CountryCode | undefined
    if (fromProfile && COUNTRY_NAMES[fromProfile]) return fromProfile

    // Fallback
    return 'CM'
  }, [user?.country])
}
