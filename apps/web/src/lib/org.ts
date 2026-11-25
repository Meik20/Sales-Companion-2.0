/**
 * Utilitaires d'identification et de gouvernance d'organisation pour Sales Companion
 */

/**
 * Génère un code d'organisation unique au format SC-[PAYS]-[5 CARACTÈRES]
 * Exemple : SC-CM-7K9P2
 * Les caractères ambigus (0, O, 1, I, L) sont exclus pour éviter toute confusion.
 */
export function generateOrgCode(countryCode = 'CM'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let randomPart = ''
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * chars.length)
    randomPart += chars.charAt(idx)
  }
  const cleanCountry =
    (countryCode || 'CM')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 2) || 'CM'
  return `SC-${cleanCountry}-${randomPart}`
}

/**
 * Normalise un NIU (Numéro d'Identification Unique) ou RCCM :
 * - Passage en majuscules
 * - Suppression des espaces, tirets, points et caractères spéciaux superflus
 */
export function normalizeNiu(niu?: string | null): string {
  if (!niu) return ''
  return niu
    .trim()
    .toUpperCase()
    .replace(/[\s\-_./]/g, '')
}

/**
 * Valide le format d'un NIU de façon souple :
 * Doit contenir au moins 6 caractères alphanumériques et au plus 30
 */
export function isValidNiuFormat(niu: string): boolean {
  const normalized = normalizeNiu(niu)
  if (!normalized) return false
  return /^[A-Z0-9]{6,30}$/.test(normalized)
}

/**
 * Formate l'affichage officiel du segment avec sa zone géographique :
 * Exemple : "PME (Ouest)", "SOHO (Littoral)"
 * Si la zone est absente ou déjà incluse, renvoie le segment proprement.
 */
export function formatDisplaySegment(
  segment?: string | null,
  zone?: string | null,
  displaySegment?: string | null
): string | null {
  if (displaySegment && typeof displaySegment === 'string' && displaySegment.trim()) {
    return displaySegment.trim()
  }
  if (!segment || typeof segment !== 'string' || !segment.trim()) {
    return null
  }
  const cleanSeg = segment.trim()
  if (cleanSeg.includes('(')) {
    return cleanSeg
  }
  if (zone && typeof zone === 'string' && zone.trim()) {
    return `${cleanSeg} (${zone.trim()})`
  }
  return cleanSeg
}

