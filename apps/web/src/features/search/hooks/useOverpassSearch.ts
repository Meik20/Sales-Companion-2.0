'use client'

/**
 * Hook OSM (OpenStreetMap) — Recherche client-side "Autour de moi"
 *
 * Stratégie multi-sources haute disponibilité :
 * 1. Source primaire : Photon (Elasticsearch sur OpenStreetMap par Komoot)
 *    - Requêtes en <250ms avec bounding-box exacte autour du GPS utilisateur
 *    - CORS natif, zéro dépendance serveur, haute résilience
 * 2. Source secondaire : Overpass QL & Nominatim en repli
 *
 * Tous les résultats sont ancrés sur les coordonnées GPS exactes de l'utilisateur
 * et triés par distance croissante (« partant » de sa position).
 */

import { useState, useEffect, useRef } from 'react'
import type { Company } from './useCompaniesSearch'
import { calculateDistanceKm, formatDistance } from '@/lib/geo-zones'

// Tags OSM à interroger pour les entreprises B2B
const OSM_BUSINESS_TAGS = [
  'amenity',
  'shop',
  'office',
  'craft',
  'industrial',
  'healthcare',
  'tourism'
] as const

// Map des tags OSM → libellés secteur Sales Companion
const OSM_SECTOR_MAP: Record<string, string> = {
  // amenity
  bank: 'Finance & Banque',
  pharmacy: 'SANTE/PHARMACIE',
  hospital: 'SANTE/PHARMACIE',
  clinic: 'SANTE/PHARMACIE',
  dentist: 'SANTE/PHARMACIE',
  restaurant: 'Hôtellerie & Restauration',
  fast_food: 'Hôtellerie & Restauration',
  hotel: 'Hôtellerie & Restauration',
  fuel: 'Énergie & Utilities',
  car_wash: 'Transport & Logistique',
  post_office: 'Services aux Entreprises',
  police: 'Services Publics',
  school: 'Éducation & Formation',
  university: 'Éducation & Formation',
  place_of_worship: 'Services Publics',
  marketplace: 'Commerce & Distribution',
  // office
  company: 'Services aux Entreprises',
  financial: 'Finance & Banque',
  insurance: 'Finance & Banque',
  estate_agent: 'Immobilier',
  telecommunication: 'Technologies & Numérique',
  it: 'Technologies & Numérique',
  lawyer: 'Conseil Juridique & Fiscal',
  accountant: 'Conseil Juridique & Fiscal',
  ngo: 'ONG & Associations',
  government: 'Services Publics',
  // shop
  supermarket: 'Commerce & Distribution',
  convenience: 'Commerce & Distribution',
  hardware: 'BTP & Construction',
  electronics: 'Technologies & Numérique',
  clothes: 'Commerce & Distribution',
  car: 'Transport & Logistique',
  car_repair: 'Transport & Logistique',
  building_materials: 'BTP & Construction',
  variety_store: 'Commerce & Distribution',
  // craft
  electrician: 'BTP & Construction',
  plumber: 'BTP & Construction',
  carpenter: 'BTP & Construction',
  painter: 'BTP & Construction',
  construction: 'BTP & Construction',
  // healthcare
  doctor: 'SANTE/PHARMACIE',
  // industrial
  factory: 'Industrie & Production',
  warehouse: 'Transport & Logistique'
}

export function osmTagsToSector(tags: Record<string, string>): string {
  for (const tagKey of OSM_BUSINESS_TAGS) {
    const val = tags[tagKey]
    if (val && OSM_SECTOR_MAP[val]) return OSM_SECTOR_MAP[val]!
  }
  // fallback: capitalise le tag brut
  for (const tagKey of OSM_BUSINESS_TAGS) {
    const val = tags[tagKey]
    if (val && val !== 'yes') {
      return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }
  return 'Commerce & Distribution'
}

export type OsmNode = {
  id: number
  type: 'node' | 'way' | 'relation'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export function osmNodeToCompany(
  node: OsmNode,
  userLat?: number | null,
  userLng?: number | null
): Company {
  const tags = node.tags ?? {}
  const name = tags['name'] || tags['name:fr'] || tags['brand'] || 'Établissement OSM'
  const lat = node.lat ?? node.center?.lat
  const lng = node.lon ?? node.center?.lon

  let distanceKm: number | undefined
  let distanceFormatted: string | undefined

  if (
    typeof userLat === 'number' &&
    typeof userLng === 'number' &&
    typeof lat === 'number' &&
    typeof lng === 'number'
  ) {
    distanceKm = calculateDistanceKm(userLat, userLng, lat, lng)
    distanceFormatted = formatDistance(distanceKm)
  }

  return {
    id: `osm_${node.id}`,
    raisonSociale: name,
    name,
    sector: osmTagsToSector(tags),
    city: tags['addr:city'] || tags['addr:place'] || undefined,
    region: tags['addr:region'] || undefined,
    adresse: [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:suburb'] || tags['addr:neighbourhood']
    ]
      .filter(Boolean)
      .join(' ') || tags['description'] || undefined,
    telephone: tags['phone'] || tags['contact:phone'] || undefined,
    email: tags['email'] || tags['contact:email'] || undefined,
    _source: 'osm_live',
    lat,
    lng,
    distanceKm,
    distanceFormatted,
    verified: false
  }
}

export type PhotonFeature = {
  type: 'Feature'
  properties: {
    osm_type?: string
    osm_id?: number | string
    osm_key?: string
    osm_value?: string
    name?: string
    street?: string
    housenumber?: string
    district?: string
    locality?: string
    city?: string
    state?: string
    country?: string
    [key: string]: unknown
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [lon, lat]
  }
}

export function buildPhotonBbox(lat: number, lng: number, radiusKm: number): string {
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  const minLon = (lng - dLng).toFixed(5)
  const minLat = (lat - dLat).toFixed(5)
  const maxLon = (lng + dLng).toFixed(5)
  const maxLat = (lat + dLat).toFixed(5)
  return `${minLon},${minLat},${maxLon},${maxLat}`
}

export function photonFeatureToCompany(
  feat: PhotonFeature,
  userLat?: number | null,
  userLng?: number | null
): Company | null {
  const props = feat.properties
  const coords = feat.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  const lng = coords[0]
  const lat = coords[1]
  const name = props.name
  if (!name || name.trim().length === 0) return null

  let distanceKm: number | undefined
  let distanceFormatted: string | undefined

  if (
    typeof userLat === 'number' &&
    typeof userLng === 'number' &&
    typeof lat === 'number' &&
    typeof lng === 'number'
  ) {
    distanceKm = calculateDistanceKm(userLat, userLng, lat, lng)
    distanceFormatted = formatDistance(distanceKm)
  }

  const rawKey = props.osm_key || 'amenity'
  const rawValue = props.osm_value || 'commercial'
  const sector =
    OSM_SECTOR_MAP[rawValue] ||
    osmTagsToSector({ [rawKey]: rawValue })

  const street = [props.housenumber, props.street].filter(Boolean).join(' ')
  const addressParts = [street, props.district || props.locality, props.city].filter(Boolean)

  return {
    id: `osm_${props.osm_type || 'N'}_${props.osm_id}`,
    raisonSociale: name,
    name,
    sector,
    city: props.city || props.district || undefined,
    region: props.state || undefined,
    adresse: addressParts.join(', ') || undefined,
    _source: 'osm_live',
    lat,
    lng,
    distanceKm: typeof distanceKm === 'number' ? Math.round(distanceKm * 10) / 10 : undefined,
    distanceFormatted,
    verified: false
  }
}

export type OverpassSearchState = {
  items: Company[]
  isLoading: boolean
  error: string | null
  source: string | null
}

export function buildOverpassQuery(lat: number, lng: number, radiusM: number): string {
  const r = radiusM
  const tagFilters = OSM_BUSINESS_TAGS.map(
    (tag) => `
  node["${tag}"](around:${r},${lat},${lng});
  way["${tag}"](around:${r},${lat},${lng});`
  ).join('')

  return `[out:json][timeout:20];
(${tagFilters}
);
out center 60;`
}

// Mots-clés de recherche selon le secteur demandé
function getSearchTermsForSector(sector?: string): string[] {
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
  if (s.includes('btp') || s.includes('construction')) {
    return ['btp', 'construction', 'quincaillerie', 'materiaux', 'batiment']
  }
  if (s.includes('tech') || s.includes('numérique') || s.includes('informatique')) {
    return ['informatique', 'telecom', 'numerique', 'logiciel', 'technologie']
  }
  if (s.includes('commerce') || s.includes('vente')) {
    return ['commerce', 'magasin', 'boutique', 'supermarche', 'vente']
  }
  if (s.includes('santé') || s.includes('pharmacie') || s.includes('medical')) {
    return ['pharmacie', 'clinique', 'hopital', 'laboratoire', 'cabinet medical']
  }
  if (s.includes('finance') || s.includes('banque') || s.includes('assurance')) {
    return ['banque', 'assurance', 'microfinance', 'credit', 'epargne']
  }
  if (s.includes('hotel') || s.includes('restaurant')) {
    return ['hotel', 'restaurant', 'auberge', 'traiteur']
  }
  if (s.includes('transport') || s.includes('logistique')) {
    return ['transport', 'logistique', 'transit', 'livraison', 'voyage']
  }
  if (s.includes('agri') || s.includes('agro')) {
    return ['agriculture', 'agroalimentaire', 'elevage', 'agricole']
  }
  return ['entreprise', 'societe', 'agence', 'bureau', sector]
}

/**
 * Hook principal — Exécute la recherche géolocalisée OSM (Photon + Overpass)
 * strictement ancrée sur les coordonnées GPS exactes de l'utilisateur.
 */
export function useOverpassSearch(params: {
  lat: number | null
  lng: number | null
  radiusKm: number
  enabled: boolean
  sector?: string
}): OverpassSearchState {
  const { lat, lng, radiusKm, enabled, sector } = params

  const [state, setState] = useState<OverpassSearchState>({
    items: [],
    isLoading: false,
    error: null,
    source: null
  })

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!enabled || lat === null || lng === null) {
      setState({ items: [], isLoading: false, error: null, source: null })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const userLat = lat
    const userLng = lng

    // Normalisation : radiusKm doit être en kilomètres (ex: 5 pour 5km)
    const effectiveRadiusKm = radiusKm > 100 ? radiusKm / 1000 : radiusKm
    const bbox = buildPhotonBbox(userLat, userLng, effectiveRadiusKm)
    const terms = getSearchTermsForSector(sector)

    setState((s) => ({ ...s, isLoading: true, error: null }))

    async function fetchOsmPlaces() {
      try {
        // ── 1. Tentative via l'endpoint interne /api/search/osm (Same-Origin, CSP & Ad-Blocker Safe) ──
        try {
          const apiParams = new URLSearchParams()
          apiParams.set('lat', userLat.toString())
          apiParams.set('lng', userLng.toString())
          apiParams.set('radius', effectiveRadiusKm.toString())
          if (sector) apiParams.set('sector', sector)

          const apiResp = await fetch(`/api/search/osm?${apiParams.toString()}`, {
            signal: controller.signal
          })

          if (apiResp.ok) {
            const apiData = await apiResp.json()
            if (Array.isArray(apiData.items) && apiData.items.length > 0) {
              if (!controller.signal.aborted) {
                setState({
                  items: apiData.items,
                  isLoading: false,
                  error: null,
                  source: 'OpenStreetMap (OSM Local Engine)'
                })
              }
              return
            }
          }
        } catch (apiErr: any) {
          if (apiErr?.name === 'AbortError') return
          // Repli direct client-side ci-dessous
        }

        const seenIds = new Set<string>()
        const seenNames = new Set<string>()
        const collectedCompanies: Company[] = []

        // ── 2. Repli direct vers Photon (OpenStreetMap Elasticsearch) ────────
        const photonFetches = terms.map(async (term) => {
          const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(term)}&lat=${userLat}&lon=${userLng}&limit=8&bbox=${bbox}`
          try {
            const resp = await fetch(url, { signal: controller.signal })
            if (!resp.ok) return []
            const data = await resp.json()
            return (data.features || []) as PhotonFeature[]
          } catch {
            return []
          }
        })

        const resultsArrays = await Promise.all(photonFetches)

        if (controller.signal.aborted) return

        for (const features of resultsArrays) {
          for (const feat of features) {
            const company = photonFeatureToCompany(feat, userLat, userLng)
            if (!company) continue

            // Vérification stricte du rayon demandé (avec tolérance de 15% pour les limites de quartier)
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

        // ── 3. Tri strict par distance croissante (du plus proche au plus lointain) ──
        collectedCompanies.sort((a, b) => {
          const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 9999
          const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 9999
          return distA - distB
        })

        if (!controller.signal.aborted) {
          setState({
            items: collectedCompanies,
            isLoading: false,
            error: null,
            source: 'OpenStreetMap (Photon Engine)'
          })
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        setState({
          items: [],
          isLoading: false,
          error: err?.message || 'Erreur lors de la recherche OpenStreetMap',
          source: null
        })
      }
    }

    fetchOsmPlaces()

    return () => {
      controller.abort()
    }
  }, [lat, lng, radiusKm, enabled, sector])

  return state
}
