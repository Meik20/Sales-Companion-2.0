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
          
          if (currentDailyUsed < dailyLimit) {
            await userRef.update({ dailyUsed: currentDailyUsed + 1 })
          }
        }
      } catch (err) {
        console.error('[search/companies] Auth error:', err)
        // Token invalide → on continue sans déduire
      }
    }

    // ── Google Maps Places Search ──
    // Si lat & lng sont fournis et qu'une clé API est disponible
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
    if (lat && lng && googleApiKey) {
      try {
        const keyword = [query, sector].filter(Boolean).join(' ')
        let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${googleApiKey}`
        if (keyword) {
           url += `&keyword=${encodeURIComponent(keyword)}`
        }
        
        const gRes = await fetch(url)
        const gData = await gRes.json()
        
        if (gData.results) {
           const places = gData.results.map((place: any) => ({
              id: place.place_id,
              raisonSociale: place.name,
              adresse: place.vicinity,
              city: place.vicinity,
              sector: place.types?.join(', ') || sector || '',
              region: region || '',
              _source: 'google_places',
              googlePlaceId: place.place_id,
              rating: place.rating,
           }))
           return NextResponse.json(places)
        }
      } catch (err) {
        console.error('[search/companies] Google Maps Error:', err)
        // Fallback to internal search
      }
    }

    // ── Requête Firestore (Fallback ou Recherche Normale) ──
    // On applique les filtres disponibles, puis filtrage texte côté app
    let q: FirebaseFirestore.Query = adminDb.collection('companies').limit(200)

    if (region) {
      q = q.where('region', '==', region)
    }
    if (city) {
      q = q.where('city', '==', city)
    }
    if (sector) {
      q = q.where('sector', '==', sector)
    }

    const snap = await q.get()
    let companies = snap.docs.map((d) => {
      const data = d.data()
      // Spread raw fields first so typed aliases always win, id set once at end
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

    // ── Filtrage texte libre côté app ──
    if (query) {
      const q_lower = query.toLowerCase()
      companies = companies.filter((c) => {
        const searchable = [
          c.raisonSociale, c.niu, c.sigle, c.dirigeant,
          c.sector, c.region, c.city, c.telephone, c.email, c.rccm,
        ].join(' ').toLowerCase()
        return searchable.includes(q_lower)
      })
    }

    return NextResponse.json(companies)
  } catch (error) {
    console.error('[search/companies] Error:', error)
    return NextResponse.json([], { status: 200 }) // Always return array
  }
}
