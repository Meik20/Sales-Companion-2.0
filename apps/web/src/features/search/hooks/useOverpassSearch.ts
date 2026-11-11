'use client'

/**
 * Hook OSM/Overpass — Recherche client-side "Autour de moi"
 *
 * Stratégie : appel direct depuis le navigateur vers l'API Overpass (pas
 * de proxy serveur → évite les timeouts Vercel). Retourne les POI
 * commerciaux présents dans OpenStreetMap dans le rayon demandé.
 *
 * L'objectif est de COMPLÉTER les résultats Supabase avec des entreprises
 * hors base de données interne.
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
  // craft
  electrician: 'BTP & Construction',
  plumber: 'BTP & Construction',
  carpenter: 'BTP & Construction',
  painter: 'BTP & Construction',
  construction: 'BTP & Construction',
  // healthcare
  doctor: 'SANTE/PHARMACIE',
  // industrial
  factory: 'Industrie & Production'
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

type OsmNode = {
  id: number
  type: 'node' | 'way' | 'relation'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type OverpassResponse = {
  elements: OsmNode[]
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
]

export type OverpassSearchState = {
  items: Company[]
  isLoading: boolean
  error: string | null
  source: string | null
}

/**
 * Construit la requête Overpass QL pour chercher des entreprises autour
 * d'un point GPS dans un rayon donné.
 */
export function buildOverpassQuery(lat: number, lng: number, radiusM: number): string {
  const r = radiusM
  // On limite à 60 résultats pour ne pas saturer l'interface
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

/**
 * Hook principal — à appeler uniquement quand lat/lng sont disponibles
 * et que "Autour de moi" est actif.
 */
export function useOverpassSearch(params: {
  lat: number | null
  lng: number | null
  radiusKm: number
  enabled: boolean
}): OverpassSearchState {
  const { lat, lng, radiusKm, enabled } = params

  const [state, setState] = useState<OverpassSearchState>({
    items: [],
    isLoading: false,
    error: null,
    source: null
  })

  // Ref pour annuler une requête en cours si les params changent
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!enabled || lat === null || lng === null) {
      setState({ items: [], isLoading: false, error: null, source: null })
      return
    }

    // Annuler la requête précédente
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const radiusM = Math.round(radiusKm * 1000)
    const query = buildOverpassQuery(lat, lng, radiusM)

    setState((s) => ({ ...s, isLoading: true, error: null }))

    async function fetchOverpass() {
      let lastError: string = 'Aucun endpoint Overpass disponible.'

      for (const endpoint of OVERPASS_ENDPOINTS) {
        if (controller.signal.aborted) return

        try {
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal
          })

          if (!resp.ok) {
            lastError = `Overpass HTTP ${resp.status}`
            continue
          }

          const json: OverpassResponse = await resp.json()

          if (controller.signal.aborted) return

          // Dédoublonnage par nom + filtrage éléments sans nom
          const seen = new Set<string>()
          const companies: Company[] = []

          for (const node of json.elements) {
            const name =
              node.tags?.['name'] || node.tags?.['name:fr'] || node.tags?.['brand']
            if (!name) continue // ignore POI sans nom
            const key = name.toLowerCase().replace(/\s+/g, '')
            if (seen.has(key)) continue
            seen.add(key)
            companies.push(osmNodeToCompany(node, lat, lng))
          }

          setState({ items: companies, isLoading: false, error: null, source: endpoint })
          return
        } catch (err: any) {
          if (err?.name === 'AbortError') return
          lastError = err?.message ?? 'Erreur réseau Overpass'
          // Essayer le prochain endpoint
        }
      }

      if (!controller.signal.aborted) {
        setState({ items: [], isLoading: false, error: lastError, source: null })
      }
    }

    fetchOverpass()

    return () => {
      controller.abort()
    }
  }, [lat, lng, radiusKm, enabled])

  return state
}

