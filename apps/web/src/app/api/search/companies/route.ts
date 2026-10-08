export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, checkRateLimit, checkRateLimitByUser } from '@/lib/rate-limit'
import { PLAN_LIMITS, COUNTRY_NAMES } from '@sales-companion/shared'
import { getCachedCompanies } from '@/lib/company-search'


// Lazy import pour éviter les erreurs si firebase-admin ne s'initialise pas
async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  const { FieldValue } = await import('firebase-admin/firestore')
  const { ensureDailyReset } = await import('@/lib/quota-utils')
  return { adminDb, adminAuth, FieldValue, ensureDailyReset }
}

/**
 * GET /api/search/companies
 * Recherche dans la collection Firestore "companies" importée par l'admin.
 * Déduit 1 crédit par recherche pour l'utilisateur authentifié.
 */
const COUNTRY_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  CM: { minLat: 1.5, maxLat: 13.2, minLng: 8.0, maxLng: 16.3 },
  SN: { minLat: 12.2, maxLat: 16.8, minLng: -17.8, maxLng: -11.2 },
  CI: { minLat: 4.2, maxLat: 10.8, minLng: -8.7, maxLng: -2.4 },
  BJ: { minLat: 6.1, maxLat: 12.6, minLng: 0.6, maxLng: 3.9 },
  TG: { minLat: 5.8, maxLat: 11.3, minLng: -0.3, maxLng: 1.9 },
  TD: { minLat: 7.0, maxLat: 23.6, minLng: 14.0, maxLng: 24.1 },
  CF: { minLat: 2.1, maxLat: 11.1, minLng: 14.0, maxLng: 27.6 }
}

function isWithinCountry(lat: number, lng: number, country: string) {
  const bounds = COUNTRY_BOUNDS[country]
  return Boolean(bounds && lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng)
}

export async function GET(request: NextRequest) {
  try {
    // 1. IP Rate Limiting (60 req/min)
    const ip = getClientIp(request)
    const ipLimit = await checkRateLimit(ip, { limit: 60, windowMs: 60 * 1000 })
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes depuis cette adresse IP. Veuillez réessayer dans une minute.', message: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const { adminDb, adminAuth } = await getAdminModules()


    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const sector = searchParams.get('sector')?.trim()
    const region = searchParams.get('region')?.trim()
    const city = searchParams.get('city')?.trim()
    const query = searchParams.get('query')?.trim()
    const lat = searchParams.get('lat')?.trim()
    const lng = searchParams.get('lng')?.trim()
    const radius = searchParams.get('radius')?.trim() || '10000'

    // ── Auth obligatoire ──
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié. Token de session manquant.', message: 'Non authentifié.' },
        { status: 401 }
      )
    }

    let userId: string
    let userCountry = 'CM'
    let userData: any = {}
    let userRef: any = null

    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userId = decoded.uid

      // 2. User ID Rate Limiting (30 req/min)
      const userLimit = await checkRateLimitByUser(userId, { limit: 30, windowMs: 60 * 1000 })
      if (!userLimit.success) {
        return NextResponse.json(
          { error: 'Trop de requêtes pour votre compte. Veuillez ralentir.', message: 'Rate limit exceeded' },
          { status: 429 }
        )
      }
      userRef = adminDb.collection('users').doc(userId)
      const userSnap = await userRef.get()
      if (userSnap.exists) {
        userData = userSnap.data() ?? {}
        userCountry = (userData.country || 'CM').toUpperCase()
        if (!COUNTRY_NAMES[userCountry]) userCountry = 'CM'
      }
    } catch (err) {
      console.error('[search/companies] Auth verification error:', err)
      return NextResponse.json(
        { error: 'Session invalide ou expirée.', message: 'Session expirée.' },
        { status: 401 }
      )
    }

    // Déduire un crédit seulement si charge !== 'false'
    if (searchParams.get('charge') !== 'false' && userRef && userData) {
      const { ensureDailyReset } = await getAdminModules()
      const plan = (userData.plan || 'free') as keyof typeof PLAN_LIMITS
      // Toujours lire le quota depuis PLAN_LIMITS — source de vérité unique,
      // indépendante du champ dailyLimit potentiellement obsolète en Firestore.
      const dailyLimit = PLAN_LIMITS[plan] ?? 10
      const currentDailyUsed = await ensureDailyReset(userRef, userData)

      if (currentDailyUsed >= dailyLimit) {
        const quotaMessage = plan === 'free'
          ? `Quota mensuel épuisé (${dailyLimit} crédits).`
          : `Quota journalier épuisé (${dailyLimit} crédits).`
        return NextResponse.json(
          { error: quotaMessage, message: quotaMessage },
          { status: 429 }
        )
      }
      await userRef.update({ dailyUsed: currentDailyUsed + 1 })
    }

    // ── 1. Google Maps Places Search ──
    let googleResults: any[] = []
    const googleApiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY

    if (googleApiKey && (query || (lat && lng))) {
      try {
        let url = ''
        const keyword = [query, sector].filter(Boolean).join(' ')
        const countryName = COUNTRY_NAMES[userCountry] || 'Cameroun'

        if (lat && lng && isWithinCountry(Number(lat), Number(lng), userCountry)) {
          url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${googleApiKey}`
          if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`
        } else if (query) {
          const finalQuery = query.toLowerCase().includes(countryName.toLowerCase())
            ? query
            : `${query} ${countryName}`
          url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(finalQuery)}&key=${googleApiKey}`
        }

        if (url) {
          const gRes = await fetch(url)
          const gData = await gRes.json()
          if (gData.results) {
            googleResults = gData.results
              .filter((place: any) => {
                const location = place.geometry?.location
                return location
                  ? isWithinCountry(Number(location.lat), Number(location.lng), userCountry)
                  : normalize(place.formatted_address || '').includes(normalize(countryName))
              })
              .map((place: any) => ({
              id: place.place_id,
              raisonSociale: place.name,
              adresse: place.formatted_address || place.vicinity || '',
              city: place.vicinity || '',
              sector: place.types?.join(', ') || sector || '',
              region: region || '',
              country: userCountry,
              _source: 'google_places',
              googlePlaceId: place.place_id,
              rating: place.rating,
              telephone: ''
              }))
          }
        }
      } catch (err) {
        console.error('[search/companies] Google Maps Error:', err)
      }
    }

    // ── 2. Helper : normalise une chaîne (accents, ponctuation, casse) ──
    function normalize(str: string) {
      return String(str ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['’\-]/g, ' ')
        .trim()
    }

    // Variantes de mots (gestion des pluriels en français : -s, -x, -aux, etc.)
    function getWordVariants(word: string): string[] {
      const norm = normalize(word)
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

    // Synonymes sectoriels pour enrichir les recherches
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

    // Supprime les repères spatiaux d'une adresse ("derrière la pharmacie...", "en face de...", etc.)
    // pour éviter qu'un mot-clé d'activité ne matche par erreur sur les voisins ou repères
    function cleanAddressLandmarks(rawAddress: string): string {
      if (!rawAddress) return ''
      const norm = normalize(rawAddress)
      return norm.replace(
        /\b(?:derriere|en\s+face(?:\s+de|\s+du|\s+des)?|face\s+(?:a|au|aux|\s+a\s+la)?|a\s+cote(?:\s+de|\s+du|\s+des)?|non\s+loin(?:\s+de|\s+du|\s+des)?|pres(?:\s+de|\s+du|\s+des)?|proche(?:\s+de|\s+du|\s+des)?|apres|vers|voisin(?:\s+de)?)\s+(?:la|le|les|l|un|une|du|des|au|aux)?\s*[a-z0-9\s'-]{2,40}?(?=[,.;\n\-]|\s+(?:face|derriere|a\s+cote|rue|boulevard|bvd|av|avenue|carrefour|rond\s*point|quartier|douala|yaounde|akwa|bonanjo|bastos)|$)/gi,
        ' '
      )
    }

    // Vérifie si un secteur correspond à une cible (avec synonymes)
    function matchesSector(companySector: string, targetSector: string): boolean {
      if (!targetSector) return true
      const nComp = normalize(companySector)
      const nTarget = normalize(targetSector)
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

    // Évaluation et scoring d'une entreprise par rapport à la requête texte
    function evaluateCompanyMatch(
      company: any,
      queryTokens: string[],
      normalizedQuery: string
    ): { matches: boolean; score: number } {
      const nameNorm = normalize(company.raisonSociale)
      const sigleNorm = normalize(company.sigle)
      const sectorNorm = normalize(company.sector)
      const cityNorm = normalize(company.city)
      const regionNorm = normalize(company.region)
      const technicalNorm = normalize(
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

        // Scoring pondéré
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

      // Bonus si le nom correspond exactement ou commence par la recherche complète
      if (nameNorm === normalizedQuery) score += 250
      else if (nameNorm.startsWith(normalizedQuery)) score += 150

      // Barrière anti-faux positifs :
      // Si la requête contient au moins 2 mots (ex: "PHARMACIES AKWA"),
      // et qu'AUCUN mot n'a matché dans l'identité (nom, sigle, secteur) :
      // le résultat ne provient que de repères d'adresse -> rejeté !
      if (queryTokens.length >= 2 && identityMatchCount === 0) {
        return { matches: false, score: 0 }
      }

      // Pénalité pour les points relais / TPE / guichets bancaires lorsqu'on cherche une activité spécifique
      const isPosOrAtm = /pos|tpe|guichet|distributeur|atm/i.test(nameNorm) || /banque|microfinance/i.test(sectorNorm)
      const isHealthQuery = queryTokens.some((t) => /pharmaci|sante|medic|soin|hopital|clinique/i.test(t))
      if (isPosOrAtm && isHealthQuery) {
        score -= 120
      }

      if (company.verified) score += 10

      return { matches: true, score }
    }

    // ── 3. Récupération des données (via Cache Redis Upstash + fallback mémoire) ──
    let internalCompanies: any[] = []
    try {
      const allCompanies = await getCachedCompanies()
      internalCompanies = [...allCompanies]
    } catch (err) {
      console.warn('[search/companies] Failed to load cached companies:', err)
      internalCompanies = []
    }

    // ── 3.1 Filtrage strict par pays de l'utilisateur (défini à l'inscription) ──
    internalCompanies = internalCompanies.filter((c) => {
      const cCountry = (c.country || 'CM').toUpperCase()
      return cCountry === userCountry
    })

    // ── 4. Filtrage intelligent & scoring ──
    const matchLocationKeywords = (
      dataValue: string,
      filterValue: string
    ) => {
      const nData = normalize(dataValue)
      const kws = normalize(filterValue)
        .split(/[\s&/]+/)
        .filter((kw) => kw.length >= 2)
      if (kws.length === 0) return nData.includes(normalize(filterValue))
      return kws.some((kw) => nData.includes(kw))
    }

    if (region) {
      internalCompanies = internalCompanies.filter((c) =>
        matchLocationKeywords(c.region as string, region)
      )
    }
    if (city) {
      internalCompanies = internalCompanies.filter((c) =>
        matchLocationKeywords(c.city as string, city)
      )
    }
    if (sector) {
      internalCompanies = internalCompanies.filter((c) =>
        matchesSector(c.sector as string, sector)
      )
    }

    const normQuery = query ? normalize(query) : ''
    const queryTokens = normQuery ? normQuery.split(/\s+/).filter((t) => t.length >= 2) : []

    if (queryTokens.length > 0) {
      const scoredCompanies: any[] = []
      for (const comp of internalCompanies) {
        const evalResult = evaluateCompanyMatch(comp, queryTokens, normQuery)
        if (evalResult.matches) {
          scoredCompanies.push({
            ...comp,
            _searchScore: evalResult.score
          })
        }
      }
      internalCompanies = scoredCompanies
    }

    // Scoring des résultats Google Places éventuels
    if (queryTokens.length > 0 && googleResults.length > 0) {
      googleResults = googleResults
        .map((place) => {
          const evalRes = evaluateCompanyMatch(place, queryTokens, normQuery)
          return {
            ...place,
            _searchScore: evalRes.score + 15 // Léger bonus de fraîcheur Google Places
          }
        })
        .filter((p) => (p._searchScore ?? 0) > -50)
    }

    // ── 5. Fusion et tri par pertinence ──
    const allCompanies = [...internalCompanies, ...googleResults]

    if (queryTokens.length > 0) {
      allCompanies.sort((a, b) => ((b._searchScore as number) ?? 0) - ((a._searchScore as number) ?? 0))
    }

    // ── 6. Pagination (Plafond factuel fixé à 10 résultats par requête) ──
    const pageSize = 10
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedCompanies = allCompanies.slice(start, end)


    // ── Enregistrement de la recherche pour les stats admin (toujours) ──
    try {
      const { adminDb, FieldValue } = await getAdminModules()

      const userName = userData.name || userData.email || 'Anonymous'
      const userEmail = userData.email || 'anonymous@platform'
      const plan = userData.plan || 'free'

      await adminDb.collection('searches').add({
        userId: userId || 'anonymous',
        userName,
        userEmail,
        plan,
        country: userCountry,
        sector: sector || null,
        region: region || null,
        city: city || null,
        query: query || null,
        radius: radius || null,
        resultsCount: allCompanies.length,
        createdAt: FieldValue.serverTimestamp()
      })
    } catch (err) {
      console.error('[search/companies] Search logging error:', err)
    }

    return NextResponse.json({
      items: paginatedCompanies,
      total: allCompanies.length,
      page,
      pageSize,
      totalPages: Math.ceil(allCompanies.length / pageSize)
    })
  } catch (error) {
    console.error('[search/companies] Global Critical Error:', error)
    return NextResponse.json(
      {
        items: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
