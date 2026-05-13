export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'

// Lazy import pour éviter les erreurs si firebase-admin ne s'initialise pas
async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  const { ensureDailyReset } = await import('@/lib/quota-utils')
  return { adminDb, adminAuth, ensureDailyReset }
}

/**
 * GET /api/search/companies
 * Recherche dans la collection Firestore "companies" importée par l'admin.
 * Déduit 1 crédit par recherche pour l'utilisateur authentifié.
 */
// Cache en mémoire pour éviter de recharger 500k docs à chaque clic
let cachedCompanies: any[] | null = null
let lastCacheUpdate = 0
const CACHE_DURATION = 1000 * 60 * 15 // 15 minutes

export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdminModules()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const sector = searchParams.get('sector')?.trim()
    const region = searchParams.get('region')?.trim()
    const city   = searchParams.get('city')?.trim()
    const query  = searchParams.get('query')?.trim()
    const lat    = searchParams.get('lat')?.trim()
    const lng    = searchParams.get('lng')?.trim()
    const radius = searchParams.get('radius')?.trim() || '10000'

    // ── Auth : déduire un crédit seulement si charge !== 'false' ──
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    let userId: string | null = null

    if (token && searchParams.get('charge') !== 'false') {
      try {
        const { ensureDailyReset } = await getAdminModules()
        const decoded = await adminAuth.verifyIdToken(token)
        userId = decoded.uid

        const userRef = adminDb.collection('users').doc(userId)
        const userSnap = await userRef.get()
        if (userSnap.exists) {
          const data = userSnap.data()!
          const dailyLimit = (data.dailyLimit as number) ?? 10
          const currentDailyUsed = await ensureDailyReset(userRef, data)
          
          if (currentDailyUsed >= dailyLimit) {
            const quotaMessage = `Quota journalier épuisé (${dailyLimit} crédits).`
            return NextResponse.json({ error: quotaMessage, message: quotaMessage }, { status: 429 })
          }
          await userRef.update({ dailyUsed: currentDailyUsed + 1 })
        }
      } catch (err) {
        console.error('[search/companies] Auth error:', err)
      }
    }

    // ── 1. Google Maps Places Search ──
    let googleResults: any[] = []
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
    
    if (googleApiKey && (query || (lat && lng))) {
      try {
        let url = ""
        const keyword = [query, sector].filter(Boolean).join(' ')
        
        if (lat && lng) {
          url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${googleApiKey}`
          if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`
        } else if (query) {
          const finalQuery = query.toLowerCase().includes('cameroun') ? query : `${query} Cameroun`
          url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(finalQuery)}&key=${googleApiKey}`
        }

        if (url) {
          const gRes = await fetch(url)
          const gData = await gRes.json()
          if (gData.results) {
            googleResults = gData.results.map((place: any) => ({
              id: place.place_id,
              raisonSociale: place.name,
              adresse: place.formatted_address || place.vicinity || '',
              city: place.vicinity || '',
              sector: place.types?.join(', ') || sector || '',
              region: region || '',
              _source: 'google_places',
              googlePlaceId: place.place_id,
              rating: place.rating,
              telephone: '',
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

    // ── 3. Récupération des données (avec Cache) ──
    if (!cachedCompanies || (Date.now() - lastCacheUpdate > CACHE_DURATION)) {
      console.log('[search/companies] Refreshing companies cache...')
      const snap = await adminDb.collection('companies').limit(500000).get()
      cachedCompanies = snap.docs.map((d) => {
        const data = d.data()
        return {
          ...data,
          id: d.id,
          raisonSociale: data.raisonSociale ?? data.name ?? '',
          sector:        data.sector ?? data.activite_principale ?? '',
          region:        data.region ?? data.centre_de_rattachement ?? '',
          city:          data.city ?? data.ville ?? '',
          niu:           data.niu ?? '',
          sigle:         data.sigle ?? '',
          dirigeant:     data.dirigeant ?? '',
          telephone:     data.telephone ?? '',
          email:         data.email ?? '',
          rccm:          data.rccm ?? '',
          adresse:       data.adresse ?? '',
          formeJuridique: data.formeJuridique ?? '',
          capital:       data.capital ?? '',
        }
      })
      lastCacheUpdate = Date.now()
      console.log(`[search/companies] Cache updated with ${cachedCompanies.length} companies.`)
    }

    let internalCompanies = [...(cachedCompanies || [])]

    // ── 4. Filtrage flexible ──
    const matchKeywords = (dataValue: string, filterValue: string, logic: 'every' | 'some' = 'every') => {
      const nData = normalize(dataValue)
      const kws = normalize(filterValue).split(/[\s&/]+/).filter(kw => kw.length >= 2)
      if (kws.length === 0) return nData.includes(normalize(filterValue))
      return kws[logic](kw => nData.includes(kw))
    }

    if (region) {
      internalCompanies = internalCompanies.filter((c) => matchKeywords(c.region as string, region, 'some'))
    }
    if (city) {
      internalCompanies = internalCompanies.filter((c) => matchKeywords(c.city as string, city, 'some'))
    }
    if (sector) {
      internalCompanies = internalCompanies.filter((c) => matchKeywords(c.sector as string, sector, 'some'))
    }
    if (query) {
      internalCompanies = internalCompanies.filter((c) => {
        const searchable = normalize([
          c.raisonSociale, c.niu, c.sigle, c.dirigeant,
          c.sector, c.region, c.city, c.telephone, c.email, c.rccm,
        ].join(' '))
        const kws = normalize(query).split(/\s+/).filter(Boolean)
        return kws.every((kw) => searchable.includes(kw))
      })
    }

    // ── 5. Fusion des résultats ──
    const allCompanies = [...internalCompanies, ...googleResults]

    // ── 6. Pagination ──
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedCompanies = allCompanies.slice(start, end)

    return NextResponse.json({
      items: paginatedCompanies,
      total: allCompanies.length,
      page,
      pageSize,
      totalPages: Math.ceil(allCompanies.length / pageSize)
    })
  } catch (error) {
    console.error('[search/companies] Global Critical Error:', error)
    return NextResponse.json({ 
      items: [], 
      total: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
