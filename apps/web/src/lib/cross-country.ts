import type { CountryCode } from '@sales-companion/shared'

export interface UserAccessProfile {
  role?: string | null
  plan?: string | null
  country?: string | null
  subscriptionExpired?: boolean | null
  subscriptionExpiresAt?: unknown
  planExpiresAt?: unknown
}

function getExpiryTimestamp(value: unknown): number {
  if (typeof value === 'string') return Date.parse(value)
  if (value instanceof Date) return value.getTime()
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: () => Date }).toDate
    if (typeof toDate === 'function') {
      try {
        return toDate.call(value).getTime()
      } catch {
        return Number.NaN
      }
    }
  }
  return Number.NaN
}

/**
 * Détermine si un utilisateur a accès à la prospection multi-pays (Cross-Country).
 *
 * Invariant architectural :
 * - Rôle 'admin' : accès sans restriction.
 * - Plan 'enterprise' avec abonnement actif (non expiré) : accès complet aux 7 pays.
 * - Tout autre plan (free, starter, pro) : strictement restreint à son pays de rattachement.
 */
export function hasCrossCountryAccess(user: UserAccessProfile | null | undefined): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.plan !== 'enterprise') return false
  if (user.subscriptionExpired === true) return false

  const expiryRaw = user.subscriptionExpiresAt ?? user.planExpiresAt
  if (expiryRaw) {
    const expiresAt = getExpiryTimestamp(expiryRaw)
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      return false
    }
  }

  return true
}

export const CROSS_COUNTRY_ERROR_CODE = 'CROSS_COUNTRY_REQUIRES_ENTERPRISE'
export const CROSS_COUNTRY_ERROR_MESSAGE =
  "L'accès aux bases de données des autres pays (Cross-Country) est réservé au forfait Enterprise."
