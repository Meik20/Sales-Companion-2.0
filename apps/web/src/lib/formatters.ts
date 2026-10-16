/**
 * Utilitaires de formatage de l'application Sales Companion.
 */

/**
 * Raccourcit les montants pour les vues mobiles et compactes avec des lettres (K, M, B).
 * Exemples :
 * - 200 000 => "200 K"
 * - 2 000 000 => "2 M"
 * - 234 900 => "235 K"
 * - 1 500 000 => "1,5 M" (fr) / "1.5 M" (en)
 * - 500 => "500"
 */
export function formatCompactAmount(
  val: number | null | undefined,
  locale: string = 'fr'
): string {
  if (val == null || isNaN(val)) return '0'
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''

  if (abs >= 1_000_000_000) {
    const n = abs / 1_000_000_000
    const formatted = n >= 100 ? Math.round(n) : n.toFixed(1)
    const clean = String(formatted).replace(/\.0$/, '').replace('.', locale === 'fr' ? ',' : '.')
    return `${sign}${clean} B`
  }

  if (abs >= 1_000_000) {
    const n = abs / 1_000_000
    const formatted = n >= 100 ? Math.round(n) : n.toFixed(1)
    const clean = String(formatted).replace(/\.0$/, '').replace('.', locale === 'fr' ? ',' : '.')
    return `${sign}${clean} M`
  }

  if (abs >= 1_000) {
    const n = abs / 1_000
    const formatted = n >= 100 ? Math.round(n) : n.toFixed(1)
    const clean = String(formatted).replace(/\.0$/, '').replace('.', locale === 'fr' ? ',' : '.')
    return `${sign}${clean} K`
  }

  return `${sign}${Math.round(abs)}`
}

/**
 * Formate un montant complet selon la locale.
 */
export function formatFullAmount(
  val: number | null | undefined,
  locale: string = 'fr'
): string {
  if (val == null || isNaN(val)) return '0'
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR').format(val)
}
