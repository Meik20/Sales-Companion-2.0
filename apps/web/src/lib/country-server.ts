import { cookies } from 'next/headers'
import { COUNTRY_NAMES, type CountryCode } from '@sales-companion/shared'

/**
 * Lit le pays de prospection actif côté serveur depuis le cookie `sc_country`.
 * Fallback: 'CM' (Cameroun).
 */
export async function getServerProspectingCountry(): Promise<CountryCode> {
  try {
    const cookieStore = await cookies()
    const val = cookieStore.get('sc_country')?.value?.toUpperCase() as CountryCode | undefined
    if (val && COUNTRY_NAMES[val]) {
      return val
    }
  } catch {
    // Évite toute rupture lors du prerendering statique
  }
  return 'CM'
}
