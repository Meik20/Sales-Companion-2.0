/**
 * Connecteur Supabase pour l'annuaire des entreprises B2B.
 * Utilise l'API REST PostgREST native (0 dépendance supplémentaire, 100% CJS/ESM safe pour Vercel).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export interface SupabaseCompanyRecord {
  id: string
  country_code: string
  raison_sociale: string
  sigle?: string | null
  niu?: string | null
  sector?: string | null
  region?: string | null
  city?: string | null
  adresse?: string | null
  telephone?: string | null
  email?: string | null
  dirigeant?: string | null
  rccm?: string | null
  forme_juridique?: string | null
  capital?: string | null
  date_creation?: string | null
  active?: boolean
  imported_by?: string | null
  raw_data?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export function isSupabaseCompaniesConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY)
}

function getHeaders(extraHeaders: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extraHeaders
  }
}

/**
 * Vérifie si la table companies est disponible sur Supabase.
 */
export async function isSupabaseCompaniesAvailable(): Promise<boolean> {
  if (!isSupabaseCompaniesConfigured()) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?limit=1`, {
      method: 'GET',
      headers: getHeaders(),
      signal: AbortSignal.timeout(2000)
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Recherche des entreprises filtrées par pays et mots-clés sur Supabase.
 */
export async function searchSupabaseCompanies(params: {
  country: string
  query?: string
  sector?: string
  city?: string
  region?: string
  limit?: number
  offset?: number
}): Promise<{ companies: SupabaseCompanyRecord[]; total: number } | null> {
  if (!isSupabaseCompaniesConfigured()) return null

  try {
    const { country, query, sector, city, region, limit = 50, offset = 0 } = params
    const searchParams = new URLSearchParams()

    // 1. Isolation stricte par pays
    searchParams.set('country_code', `eq.${country.toUpperCase()}`)

    // 2. Filtres sectoriels et géographiques
    if (sector) {
      searchParams.set('sector', `ilike.*${sector}*`)
    }
    if (city) {
      searchParams.set('city', `ilike.*${city}*`)
    }
    if (region) {
      searchParams.set('region', `ilike.*${region}*`)
    }

    // 3. Recherche textuelle multi-colonnes (nom, sigle, NIU, dirigeant)
    if (query && query.trim()) {
      const q = query.trim()
      searchParams.set(
        'or',
        `(raison_sociale.ilike.*${q}*,sigle.ilike.*${q}*,niu.ilike.*${q}*,dirigeant.ilike.*${q}*)`
      )
    }

    searchParams.set('limit', String(limit))
    searchParams.set('offset', String(offset))
    searchParams.set('order', 'created_at.desc')

    const url = `${SUPABASE_URL}/rest/v1/companies?${searchParams.toString()}`

    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders({
        Prefer: 'count=exact'
      }),
      signal: AbortSignal.timeout(3500)
    })

    if (!res.ok) {
      console.error(`[supabase-companies] Search returned HTTP ${res.status}:`, await res.text())
      return null
    }

    const contentRange = res.headers.get('content-range') // ex: 0-49/1250
    let total = 0
    if (contentRange) {
      const parts = contentRange.split('/')
      if (parts[1]) total = parseInt(parts[1], 10) || 0
    }

    const companies = (await res.json()) as SupabaseCompanyRecord[]
    return { companies, total: total || companies.length }
  } catch (err) {
    console.warn('[supabase-companies] Search failed, falling back:', err)
    return null
  }
}

/**
 * Insertion ou mise à jour en masse (Bulk Upsert) dans Supabase.
 */
export async function bulkUpsertSupabaseCompanies(
  records: SupabaseCompanyRecord[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!isSupabaseCompaniesConfigured()) {
    return { success: false, count: 0, error: 'Configuration Supabase manquante' }
  }
  if (records.length === 0) {
    return { success: true, count: 0 }
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/companies`

    // Découpage en lots de 500 pour respecter les limites HTTP
    const CHUNK_SIZE = 500
    let inserted = 0

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE)

      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders({
          Prefer: 'resolution=merge-duplicates,return=minimal'
        }),
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(15000)
      })

      if (!res.ok) {
        const errText = await res.text()
        return { success: false, count: inserted, error: `Erreur Supabase: ${errText}` }
      }

      inserted += chunk.length
    }

    return { success: true, count: inserted }
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Erreur inconnue'
    }
  }
}
