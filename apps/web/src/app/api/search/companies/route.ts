export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, checkRateLimit, checkRateLimitByUser } from '@/lib/rate-limit'
import { PLAN_LIMITS, COUNTRY_NAMES } from '@sales-companion/shared'


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
// Cache en mémoire pour éviter de recharger 50k docs à chaque clic
let cachedCompanies: any[] | null = null
let lastCacheUpdate = 0
const CACHE_DURATION = 1000 * 60 * 60 // 1 heure (réduit les lectures Firestore de 75%)
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

    // ── 2. Helper : normalise une chaîne ──
    function normalize(str: string) {
      return String(str ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    }

    // ── 3. Récupération des données (avec Cache et protection quota) ──
    let internalCompanies: any[] = []
    try {
      if (!cachedCompanies || Date.now() - lastCacheUpdate > CACHE_DURATION) {
        const snap = await adminDb.collection('companies').limit(10000).get()
        cachedCompanies = snap.docs.map((d) => {
          const data = d.data()
          return {
            ...data,
            id: d.id,
            raisonSociale: data.raisonSociale ?? data.name ?? '',
            sector: data.sector ?? data.activite_principale ?? '',
            region: data.region ?? data.centre_de_rattachement ?? '',
            city: data.city ?? data.ville ?? '',
            niu: data.niu ?? '',
            sigle: data.sigle ?? '',
            dirigeant: data.dirigeant ?? '',
            telephone: data.telephone ?? '',
            email: data.email ?? '',
            rccm: data.rccm ?? '',
            adresse: data.adresse ?? '',
            formeJuridique: data.formeJuridique ?? '',
            capital: data.capital ?? '',
            country: (data.country || 'CM').toUpperCase()
          }
        })
        lastCacheUpdate = Date.now()
      }
      internalCompanies = [...(cachedCompanies || [])]
    } catch (err) {
      console.warn('[search/companies] Firestore quota or connection limit reached, using memory cache/fallback:', err)
      internalCompanies = [...(cachedCompanies || [])]
    }

    // ── 3.1 Filtrage strict par pays de l'utilisateur (défini à l'inscription) ──
    internalCompanies = internalCompanies.filter((c) => {
      const cCountry = (c.country || 'CM').toUpperCase()
      return cCountry === userCountry
    })

    // ── 4. Filtrage flexible ──
    const matchKeywords = (
      dataValue: string,
      filterValue: string,
      logic: 'every' | 'some' = 'every'
    ) => {
      const nData = normalize(dataValue)
      const kws = normalize(filterValue)
        .split(/[\s&/]+/)
        .filter((kw) => kw.length >= 2)
      if (kws.length === 0) return nData.includes(normalize(filterValue))
      return kws[logic]((kw) => nData.includes(kw))
    }

    if (region) {
      internalCompanies = internalCompanies.filter((c) =>
        matchKeywords(c.region as string, region, 'some')
      )
    }
    if (city) {
      internalCompanies = internalCompanies.filter((c) =>
        matchKeywords(c.city as string, city, 'some')
      )
    }
    if (sector) {
      internalCompanies = internalCompanies.filter((c) =>
        matchKeywords(c.sector as string, sector, 'some')
      )
    }
    if (query) {
      internalCompanies = internalCompanies.filter((c) => {
        const searchable = normalize(
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
        const kws = normalize(query).split(/\s+/).filter(Boolean)
        return kws.every((kw) => searchable.includes(kw))
      })
    }

    // ── 5. Fusion des résultats ──
    const allCompanies = [...internalCompanies, ...googleResults]

    // ── 6. Pagination ──
    let pageSize = parseInt(searchParams.get('pageSize') || '50')
    if (isNaN(pageSize) || pageSize <= 0) {
      pageSize = 50
    }
    if (pageSize > 100) {
      pageSize = 100 // Protection anti-scraping de masse
    }
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
