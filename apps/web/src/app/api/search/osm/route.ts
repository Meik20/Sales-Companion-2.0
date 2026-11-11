export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  buildPhotonBbox,
  photonFeatureToCompany,
  type PhotonFeature
} from '@/features/search/hooks/useOverpassSearch'
import type { Company } from '@/features/search/hooks/useCompaniesSearch'

const SECTOR_TERMS: Record<string, string[]> = {
  btp: ['btp', 'construction', 'quincaillerie', 'materiaux', 'batiment'],
  tech: ['informatique', 'telecom', 'numerique', 'logiciel', 'technologie'],
  commerce: ['commerce', 'magasin', 'boutique', 'supermarche', 'vente'],
  sante: ['pharmacie', 'clinique', 'hopital', 'laboratoire', 'cabinet medical'],
  finance: ['banque', 'assurance', 'microfinance', 'credit', 'epargne'],
  hotellerie: ['hotel', 'restaurant', 'auberge', 'traiteur'],
  transport: ['transport', 'logistique', 'transit', 'livraison', 'voyage'],
  agro: ['agriculture', 'agroalimentaire', 'elevage', 'agricole']
}

function resolveTerms(sector?: string | null): string[] {
  if (!sector) {
    return [
      'entreprise',
      'societe',
      'commerce',
      'banque',
      'boutique',
      'magasin',
      'hotel',
      'restaurant',
      'pharmacie'
    ]
  }
  const s = sector.toLowerCase()
  for (const [key, terms] of Object.entries(SECTOR_TERMS)) {
    if (s.includes(key)) return terms
  }
  return ['entreprise', 'societe', 'agence', 'bureau', sector]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const latStr = searchParams.get('lat')
    const lngStr = searchParams.get('lng')
    const radiusStr = searchParams.get('radius')
    const sector = searchParams.get('sector')

    if (!latStr || !lngStr) {
      return NextResponse.json({ items: [] })
    }

    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ items: [] })
    }

    const rawRadius = radiusStr ? parseFloat(radiusStr) : 10
    const effectiveRadiusKm = rawRadius > 100 ? rawRadius / 1000 : rawRadius
    const bbox = buildPhotonBbox(lat, lng, effectiveRadiusKm)
    const terms = resolveTerms(sector)

    const seenIds = new Set<string>()
    const seenNames = new Set<string>()
    const collectedCompanies: Company[] = []

    const fetches = terms.map(async (term) => {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(term)}&lat=${lat}&lon=${lng}&limit=8&bbox=${bbox}`
      try {
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'SalesCompanion/2.0' },
          signal: AbortSignal.timeout(4000)
        })
        if (!resp.ok) return []
        const data = await resp.json()
        return (data.features || []) as PhotonFeature[]
      } catch {
        return []
      }
    })

    const resultsArrays = await Promise.all(fetches)

    for (const features of resultsArrays) {
      for (const feat of features) {
        const company = photonFeatureToCompany(feat, lat, lng)
        if (!company) continue

        // Vérification stricte du rayon (tolérance 15%)
        if (
          typeof company.distanceKm === 'number' &&
          company.distanceKm > effectiveRadiusKm * 1.15
        ) {
          continue
        }

        const nameKey = (company.raisonSociale || '').toLowerCase().replace(/\s+/g, '')
        if (seenIds.has(company.id) || seenNames.has(nameKey)) continue

        seenIds.add(company.id)
        seenNames.add(nameKey)
        collectedCompanies.push(company)
      }
    }

    // Tri radial strict croissant (du plus proche au plus lointain)
    collectedCompanies.sort((a, b) => {
      const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 9999
      const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 9999
      return distA - distB
    })

    return NextResponse.json({ items: collectedCompanies })
  } catch (err: any) {
    console.error('[/api/search/osm] Error:', err)
    return NextResponse.json({ items: [] })
  }
}
