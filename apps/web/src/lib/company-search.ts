import { adminDb } from '@/lib/firebase-admin'

export interface CompanyRecord {
  id: string
  raisonSociale: string
  sector: string
  region: string
  city: string
  niu: string
  sigle: string
  dirigeant: string
  telephone: string
  email: string
  rccm: string
  adresse: string
  formeJuridique: string
  capital: string
  [key: string]: unknown
}

let cachedCompanies: CompanyRecord[] | null = null
let lastCacheUpdate = 0
const CACHE_DURATION = 1000 * 60 * 60 // 1 heure (réduit les lectures Firestore de 75%)

/**
 * Normalise une chaîne pour une recherche insensible aux accents et à la casse
 */
export function normalizeString(str: string): string {
  return String(str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Récupère l'ensemble des entreprises avec mise en cache mémoire
 */
export async function getCachedCompanies(): Promise<CompanyRecord[]> {
  if (!cachedCompanies || Date.now() - lastCacheUpdate > CACHE_DURATION) {
    try {
      const snap = await adminDb.collection('companies').limit(10000).get()
      cachedCompanies = snap.docs.map((d) => {
        const data = d.data()
        return {
          ...data,
          id: d.id,
          raisonSociale: (data.raisonSociale ?? data.name ?? '') as string,
          sector: (data.sector ?? data.activite_principale ?? '') as string,
          region: (data.region ?? data.centre_de_rattachement ?? '') as string,
          city: (data.city ?? data.ville ?? '') as string,
          niu: (data.niu ?? '') as string,
          sigle: (data.sigle ?? '') as string,
          dirigeant: (data.dirigeant ?? '') as string,
          telephone: (data.telephone ?? '') as string,
          email: (data.email ?? '') as string,
          rccm: (data.rccm ?? '') as string,
          adresse: (data.adresse ?? '') as string,
          formeJuridique: (data.formeJuridique ?? '') as string,
          capital: (data.capital ?? '') as string
        }
      })
      lastCacheUpdate = Date.now()
    } catch (err) {
      console.error('[company-search] Error loading companies cache:', err)
      return cachedCompanies || []
    }
  }
  return cachedCompanies || []
}

export interface SearchCompaniesOptions {
  query?: string
  sector?: string
  region?: string
  city?: string
  limit?: number
}

/**
 * Filtre les entreprises selon plusieurs critères
 */
export async function searchCompanies(options: SearchCompaniesOptions): Promise<{
  totalMatches: number
  results: Partial<CompanyRecord>[]
}> {
  const companies = await getCachedCompanies()
  const { query, sector, region, city, limit = 5 } = options

  const matchKeywords = (
    dataValue: string,
    filterValue: string,
    logic: 'every' | 'some' = 'every'
  ) => {
    const nData = normalizeString(dataValue)
    const kws = normalizeString(filterValue)
      .split(/[\s&/]+/)
      .filter((kw) => kw.length >= 2)
    if (kws.length === 0) return nData.includes(normalizeString(filterValue))
    return kws[logic]((kw) => nData.includes(kw))
  }

  let filtered = companies

  if (region) {
    filtered = filtered.filter((c) => matchKeywords(c.region, region, 'some'))
  }
  if (city) {
    filtered = filtered.filter((c) => matchKeywords(c.city, city, 'some'))
  }
  if (sector) {
    filtered = filtered.filter((c) => matchKeywords(c.sector, sector, 'some'))
  }
  if (query) {
    filtered = filtered.filter((c) => {
      const searchable = normalizeString(
        [
          c.raisonSociale,
          c.niu,
          c.sigle,
          c.dirigeant,
          c.sector,
          c.region,
          c.city,
          c.telephone,
          c.email,
          c.rccm
        ].join(' ')
      )
      const kws = normalizeString(query).split(/\s+/).filter(Boolean)
      return kws.every((kw) => searchable.includes(kw))
    })
  }

  const totalMatches = filtered.length
  const maxLimit = Math.min(Math.max(limit, 1), 10) // Max 10 pour le contexte IA
  const pageResults = filtered.slice(0, maxLimit)

  // Nettoyer les champs inutiles pour économiser les tokens
  const cleanResults = pageResults.map((c) => ({
    id: c.id,
    raisonSociale: c.raisonSociale,
    sigle: c.sigle || undefined,
    sector: c.sector,
    region: c.region,
    city: c.city,
    niu: c.niu || undefined,
    dirigeant: c.dirigeant || undefined,
    telephone: c.telephone || undefined,
    email: c.email || undefined,
    adresse: c.adresse || undefined,
    rccm: c.rccm || undefined,
    formeJuridique: c.formeJuridique || undefined
  }))

  return {
    totalMatches,
    results: cleanResults
  }
}

/**
 * Recherche une entreprise spécifique par identifiant, nom, sigle ou NIU
 */
export async function getCompanyDetails(identifier: string): Promise<Partial<CompanyRecord> | null> {
  const companies = await getCachedCompanies()
  const target = normalizeString(identifier)

  if (!target) return null

  // 1. Recherche par ID exact ou NIU exact
  let found = companies.find(
    (c) =>
      c.id === identifier ||
      (c.niu && normalizeString(c.niu) === target) ||
      (c.rccm && normalizeString(c.rccm) === target)
  )

  // 2. Recherche par raison sociale exacte ou sigle exact
  if (!found) {
    found = companies.find(
      (c) =>
        normalizeString(c.raisonSociale) === target ||
        (c.sigle && normalizeString(c.sigle) === target)
    )
  }

  // 3. Recherche par inclusion
  if (!found) {
    found = companies.find(
      (c) =>
        normalizeString(c.raisonSociale).includes(target) ||
        (c.sigle && normalizeString(c.sigle).includes(target))
    )
  }

  if (!found) return null

  return {
    id: found.id,
    raisonSociale: found.raisonSociale,
    sigle: found.sigle || undefined,
    sector: found.sector,
    region: found.region,
    city: found.city,
    niu: found.niu || undefined,
    dirigeant: found.dirigeant || undefined,
    telephone: found.telephone || undefined,
    email: found.email || undefined,
    adresse: found.adresse || undefined,
    rccm: found.rccm || undefined,
    formeJuridique: found.formeJuridique || undefined,
    capital: found.capital || undefined
  }
}

/**
 * Génère des statistiques globales ou par région/secteur pour donner une vue du marché
 */
export async function getMarketOverview(options?: { region?: string; sector?: string }): Promise<{
  totalCompaniesInDatabase: number
  filteredCount: number
  topSectors: { sector: string; count: number }[]
  topCities: { city: string; count: number }[]
}> {
  const companies = await getCachedCompanies()
  let filtered = companies

  if (options?.region) {
    const r = normalizeString(options.region)
    filtered = filtered.filter((c) => normalizeString(c.region).includes(r))
  }
  if (options?.sector) {
    const s = normalizeString(options.sector)
    filtered = filtered.filter((c) => normalizeString(c.sector).includes(s))
  }

  const sectorCounts: Record<string, number> = {}
  const cityCounts: Record<string, number> = {}

  for (const c of filtered) {
    if (c.sector) sectorCounts[c.sector] = (sectorCounts[c.sector] || 0) + 1
    if (c.city) cityCounts[c.city] = (cityCounts[c.city] || 0) + 1
  }

  const topSectors = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([sector, count]) => ({ sector, count }))

  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([city, count]) => ({ city, count }))

  return {
    totalCompaniesInDatabase: companies.length,
    filteredCount: filtered.length,
    topSectors,
    topCities
  }
}
