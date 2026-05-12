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
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdminModules()

    const { searchParams } = new URL(request.url)
    const sector = searchParams.get('sector')?.trim()
    const region = searchParams.get('region')?.trim()
    const city   = searchParams.get('city')?.trim()
    const query  = searchParams.get('query')?.trim()
    const lat    = searchParams.get('lat')?.trim()
    const lng    = searchParams.get('lng')?.trim()
    const radius = searchParams.get('radius')?.trim() || '10000'

    // ── Auth optionnelle : si token présent, vérifier et déduire un crédit ──
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    let userId: string | null = null

    if (token) {
      try {
        const { adminDb, adminAuth, ensureDailyReset } = await getAdminModules()
        const decoded = await adminAuth.verifyIdToken(token)
        userId = decoded.uid

        // Déduire 1 crédit (dailyUsed + 1 avec Reset Lazy)
        const userRef = adminDb.collection('users').doc(userId)
        const userSnap = await userRef.get()
        if (userSnap.exists) {
          const data = userSnap.data()!
          const dailyLimit = (data.dailyLimit as number) ?? 10
          
          // Vérification et reset si nouveau jour
          const currentDailyUsed = await ensureDailyReset(userRef, data)
          
          if (currentDailyUsed >= dailyLimit) {
            const quotaMessage = `Quota journalier épuisé (${dailyLimit} crédits). Votre compteur sera réinitialisé demain.`
            return NextResponse.json(
              { error: quotaMessage, message: quotaMessage },
              { status: 429 }
            )
          }
          await userRef.update({ dailyUsed: currentDailyUsed + 1 })
        }
      } catch (err) {
        console.error('[search/companies] Auth error:', err)
        // Token invalide → on continue sans déduire
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
          // Use Nearby Search if we have coordinates
          url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${googleApiKey}`
          if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`
        } else if (query) {
          // Use Text Search if we only have a query (e.g. "Pharmacie Douala")
          // We append "Cameroun" to keep it local if not specified
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
              telephone: '', // Google Places doesn't return phone in nearby/text search without extra fields/details request
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

    // ── 3. Requête Firestore ──
    const snap = await adminDb.collection('companies').limit(500).get()
    let internalCompanies = snap.docs.map((d) => {
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

    // ── 4. Filtrage flexible ──
    if (region) {
      const nRegion = normalize(region)
      internalCompanies = internalCompanies.filter((c) => normalize(c.region as string).includes(nRegion))
    }
    if (city) {
      const nCity = normalize(city)
      internalCompanies = internalCompanies.filter((c) => normalize(c.city as string).includes(nCity))
    }
    if (sector) {
      const nSector = normalize(sector)
      const sectorKeywords = nSector.split(/[\s&/]+/).filter(kw => kw.length > 2)
      
      internalCompanies = internalCompanies.filter((c) => {
        const cSector = normalize(c.sector as string)
        // If no keywords (very short sector), just check inclusion
        if (sectorKeywords.length === 0) return cSector.includes(nSector)
        // Otherwise check if ANY keyword matches (OR logic for composite sectors)
        return sectorKeywords.some(kw => cSector.includes(kw))
      })
    }
    if (query) {
      const keywords = normalize(query).split(/\s+/).filter(Boolean)
      internalCompanies = internalCompanies.filter((c) => {
        const searchable = normalize([
          c.raisonSociale, c.niu, c.sigle, c.dirigeant,
          c.sector, c.region, c.city, c.telephone, c.email, c.rccm,
        ].join(' '))
        return keywords.every((kw) => searchable.includes(kw))
      })
    }
    // ── 5. Fusion des résultats ──
    const allCompanies = [...internalCompanies, ...googleResults]

    return NextResponse.json(allCompanies)
  } catch (error) {
    console.error('[search/companies] Error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
