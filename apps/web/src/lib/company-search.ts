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
  country: string
  [key: string]: unknown
}

/**
 * Limite haute du batch Firestore pour les entreprises.
 * Si la collection dépasse ce seuil, les résultats seront tronqués
 * et un avertissement sera émis. Migrer vers Algolia/Typesense au-delà de 20 000.
 */
const COMPANIES_LIMIT = 15000

/** Clé Redis et durée du cache (1 heure) */
const REDIS_KEY = 'companies:cache:v1'
const CACHE_TTL_SEC = 60 * 60 // 1 heure

/** Fallback mémoire — utilisé si Redis n'est pas disponible */
let memoryCache: CompanyRecord[] | null = null
let memoryCacheAt = 0
const MEMORY_TTL = CACHE_TTL_SEC * 1000

// ─────────────────────────────────────────────────────────────────────────────
// Helpers Redis (Upstash REST)
// ─────────────────────────────────────────────────────────────────────────────

async function redisGet(key: string): Promise<string | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000)
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.result ?? null
  } catch {
    return null
  }
}

async function redisSet(key: string, value: string, ttlSec: number): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return
  try {
    await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, ex: ttlSec }),
      signal: AbortSignal.timeout(5000)
    })
  } catch (err) {
    console.warn('[company-search] Redis SET failed (non-fatal):', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chargement depuis Firestore
// ─────────────────────────────────────────────────────────────────────────────

async function loadFromFirestore(): Promise<CompanyRecord[]> {
  const snap = await adminDb.collection('companies').limit(COMPANIES_LIMIT).get()

  if (snap.size >= COMPANIES_LIMIT) {
    console.warn(
      `[company-search] ⚠️  La collection companies a atteint la limite de ${COMPANIES_LIMIT} documents.`,
      'Les résultats de recherche peuvent être tronqués.',
      'Migrez vers Algolia ou Typesense pour une recherche complète.'
    )
  }

  return snap.docs.map((d) => {
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
      capital: (data.capital ?? '') as string,
      country: String(data.country || 'CM').toUpperCase()
    } as CompanyRecord
  })
}

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
 * Récupère l'ensemble des entreprises :
 *   1. Redis (Upstash) — partagé entre toutes les instances serverless ✅
 *   2. Mémoire locale — fallback si Redis indisponible
 *   3. Firestore — source de vérité, résultat stocké dans Redis + mémoire
 */
export async function getCachedCompanies(): Promise<CompanyRecord[]> {
  // ── 1. Essai Redis ──────────────────────────────────────────────────────
  const cached = await redisGet(REDIS_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as CompanyRecord[]
      // Mettre à jour la mémoire locale en même temps
      memoryCache = parsed
      memoryCacheAt = Date.now()
      return parsed
    } catch {
      console.warn('[company-search] Redis cache parse error, fallback to Firestore')
    }
  }

  // ── 2. Fallback mémoire (même instance) ────────────────────────────────
  if (memoryCache && Date.now() - memoryCacheAt < MEMORY_TTL) {
    return memoryCache
  }

  // ── 3. Chargement Firestore ────────────────────────────────────────────
  try {
    const companies = await loadFromFirestore()

    // Stocker dans Redis (asynchrone, non-bloquant)
    redisSet(REDIS_KEY, JSON.stringify(companies), CACHE_TTL_SEC).catch((e) =>
      console.warn('[company-search] Async Redis write failed:', e)
    )

    // Stocker en mémoire locale
    memoryCache = companies
    memoryCacheAt = Date.now()

    return companies
  } catch (err) {
    console.error('[company-search] Error loading companies from Firestore:', err)
    return memoryCache || []
  }
}

export interface SearchCompaniesOptions {
  query?: string
  sector?: string
  region?: string
  city?: string
  limit?: number
  country?: string
}

/**
 * Filtre les entreprises selon plusieurs critères
 */
// Variantes de mots (pluriels français : -s, -x, -aux, etc.)
function getWordVariants(word: string): string[] {
  const norm = normalizeString(word)
  if (norm.length <= 2) return [norm]
  const variants = new Set<string>([norm])
  if (norm.endsWith('s') || norm.endsWith('x')) {
    variants.add(norm.slice(0, -1))
  }
  if (norm.endsWith('aux')) {
    variants.add(norm.slice(0, -3) + 'al')
  }
  if (norm.endsWith('es')) {
    variants.add(norm.slice(0, -1))
    variants.add(norm.slice(0, -2))
  }
  return Array.from(variants).filter((v) => v.length >= 2)
}

const SECTOR_SYNONYMS: Record<string, string[]> = {
  sante: [
    'sante',
    'pharmacie',
    'pharmaceutique',
    'medical',
    'clinique',
    'hopital',
    'laboratoire',
    'soins',
    'dentiste',
    'maternite',
    'officine',
    'dispensaire',
    'cabinet medical'
  ],
  btp: [
    'btp',
    'construction',
    'batiment',
    'travaux',
    'genie civil',
    'architecture',
    'immobilier',
    'chantier',
    'materiaux de construction'
  ],
  commerce: [
    'commerce',
    'vente',
    'boutique',
    'magasin',
    'distribution',
    'supermarche',
    'negoce',
    'import export'
  ],
  tech: [
    'technologie',
    'technologies',
    'logiciel',
    'informatique',
    'numerique',
    'it',
    'telecom',
    'web',
    'digital',
    'reseau'
  ],
  agro: [
    'agriculture',
    'agroalimentaire',
    'agro',
    'elevage',
    'alimentaire',
    'peche',
    'agricole',
    'aviculture'
  ],
  transport: [
    'transport',
    'logistique',
    'transit',
    'fret',
    'livraison',
    'voyage',
    'messagerie'
  ],
  finance: [
    'banque',
    'finance',
    'assurance',
    'microfinance',
    'credit',
    'caisse',
    'epargne',
    'comptabilite',
    'audit'
  ],
  hotellerie: [
    'hotel',
    'hotellerie',
    'restaurant',
    'restauration',
    'auberge',
    'traiteur',
    'bar',
    'tourisme'
  ],
  education: [
    'education',
    'formation',
    'ecole',
    'universite',
    'institut',
    'college',
    'lycee',
    'enseignement'
  ],
  energie: [
    'energie',
    'mines',
    'petrole',
    'gaz',
    'solaire',
    'electricite',
    'eau',
    'hydrocarbures'
  ]
}

function cleanAddressLandmarks(rawAddress: string): string {
  if (!rawAddress) return ''
  const norm = normalizeString(rawAddress)
  return norm.replace(
    /\b(?:derriere|en\s+face(?:\s+de|\s+du|\s+des)?|face\s+(?:a|au|aux|\s+a\s+la)?|a\s+cote(?:\s+de|\s+du|\s+des)?|non\s+loin(?:\s+de|\s+du|\s+des)?|pres(?:\s+de|\s+du|\s+des)?|proche(?:\s+de|\s+du|\s+des)?|apres|vers|voisin(?:\s+de)?)\s+(?:la|le|les|l|un|une|du|des|au|aux)?\s*[a-z0-9\s'-]{2,40}?(?=[,.;\n\-]|\s+(?:face|derriere|a\s+cote|rue|boulevard|bvd|av|avenue|carrefour|rond\s*point|quartier|douala|yaounde|akwa|bonanjo|bastos)|$)/gi,
    ' '
  )
}

function matchesSector(companySector: string, targetSector: string): boolean {
  if (!targetSector) return true
  const nComp = normalizeString(companySector)
  const nTarget = normalizeString(targetSector)
  if (!nComp) return false
  if (nComp.includes(nTarget) || nTarget.includes(nComp)) return true

  for (const [groupKey, keywords] of Object.entries(SECTOR_SYNONYMS)) {
    const targetBelongs = keywords.some((kw) => nTarget.includes(kw)) || nTarget.includes(groupKey)
    if (targetBelongs) {
      if (keywords.some((kw) => nComp.includes(kw))) {
        return true
      }
    }
  }
  return false
}

function evaluateCompanyMatch(
  company: CompanyRecord,
  queryTokens: string[],
  normalizedQuery: string
): { matches: boolean; score: number } {
  const nameNorm = normalizeString(company.raisonSociale)
  const sigleNorm = normalizeString(company.sigle)
  const sectorNorm = normalizeString(company.sector)
  const cityNorm = normalizeString(company.city)
  const regionNorm = normalizeString(company.region)
  const technicalNorm = normalizeString(
    [company.niu, company.rccm, company.dirigeant, company.telephone, company.email].join(' ')
  )

  const rawAddress = [company.adresse, company.city, company.region].filter(Boolean).join(' ')
  const cleanAddressNorm = cleanAddressLandmarks(rawAddress)

  let score = 0
  let matchesAllTokens = true
  let identityMatchCount = 0

  for (const token of queryTokens) {
    const variants = getWordVariants(token)

    const inName = variants.some((v) => nameNorm.includes(v))
    const inSigle = variants.some((v) => sigleNorm.includes(v))
    const inSector = variants.some((v) => sectorNorm.includes(v))

    let inSectorSynonym = false
    for (const [groupKey, keywords] of Object.entries(SECTOR_SYNONYMS)) {
      if (variants.some((v) => keywords.includes(v) || v === groupKey)) {
        if (keywords.some((kw) => sectorNorm.includes(kw))) {
          inSectorSynonym = true
          break
        }
      }
    }

    const inIdentity = inName || inSigle || inSector || inSectorSynonym
    if (inIdentity) identityMatchCount++

    const inTechnical = variants.some((v) => technicalNorm.includes(v))
    const inLocation = variants.some((v) => cleanAddressNorm.includes(v))

    if (!inIdentity && !inTechnical && !inLocation) {
      matchesAllTokens = false
      break
    }

    if (inName) {
      const startsName = variants.some((v) => nameNorm.startsWith(v))
      const exactWordInName = variants.some((v) => new RegExp(`\\b${v}\\b`, 'i').test(nameNorm))
      if (startsName) score += 120
      else if (exactWordInName) score += 80
      else score += 40
    }
    if (inSigle) score += 70
    if (inSector) score += 90
    else if (inSectorSynonym) score += 60
    if (inTechnical) score += 30
    if (variants.some((v) => cityNorm.includes(v))) score += 45
    if (variants.some((v) => regionNorm.includes(v))) score += 20
  }

  if (!matchesAllTokens) {
    return { matches: false, score: 0 }
  }

  if (nameNorm === normalizedQuery) score += 250
  else if (nameNorm.startsWith(normalizedQuery)) score += 150

  if (queryTokens.length >= 2 && identityMatchCount === 0) {
    return { matches: false, score: 0 }
  }

  const isPosOrAtm = /pos|tpe|guichet|distributeur|atm/i.test(nameNorm) || /banque|microfinance/i.test(sectorNorm)
  const isHealthQuery = queryTokens.some((t) => /pharmaci|sante|medic|soin|hopital|clinique/i.test(t))
  if (isPosOrAtm && isHealthQuery) {
    score -= 120
  }

  return { matches: true, score }
}

export async function searchCompanies(options: SearchCompaniesOptions): Promise<{
  totalMatches: number
  results: Partial<CompanyRecord>[]
}> {
  const companies = await getCachedCompanies()
  const { query, sector, region, city, limit = 5, country = 'CM' } = options

  const matchLocationKeywords = (dataValue: string, filterValue: string) => {
    const nData = normalizeString(dataValue)
    const kws = normalizeString(filterValue)
      .split(/[\s&/]+/)
      .filter((kw) => kw.length >= 2)
    if (kws.length === 0) return nData.includes(normalizeString(filterValue))
    return kws.some((kw) => nData.includes(kw))
  }

  let filtered = companies.filter((company) => company.country === country.toUpperCase())

  if (region) {
    filtered = filtered.filter((c) => matchLocationKeywords(c.region, region))
  }
  if (city) {
    filtered = filtered.filter((c) => matchLocationKeywords(c.city, city))
  }
  if (sector) {
    filtered = filtered.filter((c) => matchesSector(c.sector, sector))
  }

  const normQuery = query ? normalizeString(query) : ''
  const queryTokens = normQuery ? normQuery.split(/\s+/).filter((t) => t.length >= 2) : []

  if (queryTokens.length > 0) {
    const scoredList: { company: CompanyRecord; score: number }[] = []
    for (const comp of filtered) {
      const evalRes = evaluateCompanyMatch(comp, queryTokens, normQuery)
      if (evalRes.matches) {
        scoredList.push({ company: comp, score: evalRes.score })
      }
    }
    scoredList.sort((a, b) => b.score - a.score)
    filtered = scoredList.map((item) => item.company)
  }

  const totalMatches = filtered.length
  const maxLimit = Math.min(Math.max(limit, 1), 10)
  const pageResults = filtered.slice(0, maxLimit)

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
    formeJuridique: c.formeJuridique || undefined,
    country: c.country
  }))

  return {
    totalMatches,
    results: cleanResults
  }
}

/**
 * Recherche une entreprise spécifique par identifiant, nom, sigle ou NIU
 */
export async function getCompanyDetails(identifier: string, country = 'CM'): Promise<Partial<CompanyRecord> | null> {
  const companies = await getCachedCompanies()
  const countryCompanies = companies.filter((company) => company.country === country.toUpperCase())
  const target = normalizeString(identifier)

  if (!target) return null

  // 1. Recherche par ID exact ou NIU exact
  let found = countryCompanies.find(
    (c) =>
      c.id === identifier ||
      (c.niu && normalizeString(c.niu) === target) ||
      (c.rccm && normalizeString(c.rccm) === target)
  )

  // 2. Recherche par raison sociale exacte ou sigle exact
  if (!found) {
    found = countryCompanies.find(
      (c) =>
        normalizeString(c.raisonSociale) === target ||
        (c.sigle && normalizeString(c.sigle) === target)
    )
  }

  // 3. Recherche par inclusion
  if (!found) {
    found = countryCompanies.find(
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
    capital: found.capital || undefined,
    country: found.country
  }
}

/**
 * Génère des statistiques globales ou par région/secteur pour donner une vue du marché
 */
export async function getMarketOverview(options?: { region?: string; sector?: string; country?: string }): Promise<{
  totalCompaniesInDatabase: number
  filteredCount: number
  topSectors: { sector: string; count: number }[]
  topCities: { city: string; count: number }[]
}> {
  const companies = await getCachedCompanies()
  let filtered = companies.filter((company) => company.country === (options?.country || 'CM').toUpperCase())

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
