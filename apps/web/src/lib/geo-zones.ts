/**
 * Référentiel des pôles urbains et coordonnées pour la géolocalisation "Autour de moi".
 * Permet de mapper précisément la position GPS d'un commercial vers sa ville et sa région.
 */

export interface GeoZone {
  country: string
  region: string
  city: string
  lat: number
  lng: number
}

export const COUNTRY_GEO_ZONES: Record<string, GeoZone[]> = {
  CM: [
    // Littoral
    { country: 'CM', region: 'Littoral', city: 'Douala', lat: 4.05, lng: 9.7 },
    { country: 'CM', region: 'Littoral', city: 'Edéa', lat: 3.8, lng: 10.13 },
    { country: 'CM', region: 'Littoral', city: 'Nkongsamba', lat: 4.95, lng: 9.94 },
    { country: 'CM', region: 'Littoral', city: 'Mbanga', lat: 4.5, lng: 9.57 },
    { country: 'CM', region: 'Littoral', city: 'Loum', lat: 4.72, lng: 9.74 },

    // Centre
    { country: 'CM', region: 'Centre', city: 'Yaoundé', lat: 3.87, lng: 11.52 },
    { country: 'CM', region: 'Centre', city: 'Mbalmayo', lat: 3.51, lng: 11.5 },
    { country: 'CM', region: 'Centre', city: 'Bafia', lat: 4.75, lng: 11.23 },
    { country: 'CM', region: 'Centre', city: 'Obala', lat: 4.17, lng: 11.53 },

    // Sud-Ouest
    { country: 'CM', region: 'Sud-Ouest', city: 'Buea', lat: 4.15, lng: 9.24 },
    { country: 'CM', region: 'Sud-Ouest', city: 'Limbe', lat: 4.02, lng: 9.21 },
    { country: 'CM', region: 'Sud-Ouest', city: 'Kumba', lat: 4.63, lng: 9.44 },
    { country: 'CM', region: 'Sud-Ouest', city: 'Tiko', lat: 4.08, lng: 9.36 },

    // Ouest
    { country: 'CM', region: 'Ouest', city: 'Bafoussam', lat: 5.48, lng: 10.42 },
    { country: 'CM', region: 'Ouest', city: 'Dschang', lat: 5.44, lng: 10.05 },
    { country: 'CM', region: 'Ouest', city: 'Bafang', lat: 5.16, lng: 10.18 },
    { country: 'CM', region: 'Ouest', city: 'Foumban', lat: 5.72, lng: 10.9 },
    { country: 'CM', region: 'Ouest', city: 'Bangangté', lat: 5.14, lng: 10.52 },

    // Sud
    { country: 'CM', region: 'Sud', city: 'Kribi', lat: 2.94, lng: 9.91 },
    { country: 'CM', region: 'Sud', city: 'Ebolowa', lat: 2.9, lng: 11.15 },
    { country: 'CM', region: 'Sud', city: 'Sangmélima', lat: 2.93, lng: 11.98 },

    // Nord-Ouest
    { country: 'CM', region: 'Nord-Ouest', city: 'Bamenda', lat: 5.96, lng: 10.16 },
    { country: 'CM', region: 'Nord-Ouest', city: 'Kumbo', lat: 6.2, lng: 10.67 },

    // Adamaoua
    { country: 'CM', region: 'Adamaoua', city: 'Ngaoundéré', lat: 7.33, lng: 13.58 },
    { country: 'CM', region: 'Adamaoua', city: 'Meiganga', lat: 6.52, lng: 14.29 },

    // Nord
    { country: 'CM', region: 'Nord', city: 'Garoua', lat: 9.3, lng: 13.4 },
    { country: 'CM', region: 'Nord', city: 'Guider', lat: 9.93, lng: 13.95 },

    // Extrême-Nord
    { country: 'CM', region: 'Extrême-Nord', city: 'Maroua', lat: 10.6, lng: 14.33 },
    { country: 'CM', region: 'Extrême-Nord', city: 'Kousseri', lat: 12.08, lng: 15.03 },

    // Est
    { country: 'CM', region: 'Est', city: 'Bertoua', lat: 4.58, lng: 13.68 },
    { country: 'CM', region: 'Est', city: 'Batouri', lat: 4.43, lng: 14.36 }
  ],

  SN: [
    { country: 'SN', region: 'Dakar', city: 'Dakar', lat: 14.69, lng: -17.44 },
    { country: 'SN', region: 'Dakar', city: 'Rufisque', lat: 14.71, lng: -17.27 },
    { country: 'SN', region: 'Thiès', city: 'Thiès', lat: 14.79, lng: -16.92 },
    { country: 'SN', region: 'Thiès', city: 'Mbour', lat: 14.42, lng: -16.96 },
    { country: 'SN', region: 'Saint-Louis', city: 'Saint-Louis', lat: 16.03, lng: -16.5 },
    { country: 'SN', region: 'Diourbel', city: 'Touba', lat: 14.86, lng: -15.88 },
    { country: 'SN', region: 'Kaolack', city: 'Kaolack', lat: 14.15, lng: -16.08 },
    { country: 'SN', region: 'Ziguinchor', city: 'Ziguinchor', lat: 12.58, lng: -16.27 }
  ],

  CI: [
    { country: 'CI', region: 'Abidjan', city: 'Abidjan', lat: 5.36, lng: -4.0 },
    { country: 'CI', region: 'Yamoussoukro', city: 'Yamoussoukro', lat: 6.82, lng: -5.27 },
    { country: 'CI', region: 'Vallée du Bandama', city: 'Bouaké', lat: 7.69, lng: -5.03 },
    { country: 'CI', region: 'Bas-Sassandra', city: 'San-Pédro', lat: 4.75, lng: -6.64 },
    { country: 'CI', region: 'Sassandra-Marahoué', city: 'Daloa', lat: 6.88, lng: -6.45 },
    { country: 'CI', region: 'Savanes', city: 'Korhogo', lat: 9.45, lng: -5.63 }
  ],

  BJ: [
    { country: 'BJ', region: 'Littoral', city: 'Cotonou', lat: 6.37, lng: 2.43 },
    { country: 'BJ', region: 'Ouémé', city: 'Porto-Novo', lat: 6.5, lng: 2.62 },
    { country: 'BJ', region: 'Borgou', city: 'Parakou', lat: 9.34, lng: 2.63 },
    { country: 'BJ', region: 'Atlantique', city: 'Abomey-Calavi', lat: 6.45, lng: 2.36 }
  ],

  TG: [
    { country: 'TG', region: 'Maritime', city: 'Lomé', lat: 6.13, lng: 1.22 },
    { country: 'TG', region: 'Centrale', city: 'Sokodé', lat: 8.98, lng: 1.13 },
    { country: 'TG', region: 'Kara', city: 'Kara', lat: 9.55, lng: 1.19 }
  ],

  TD: [
    { country: 'TD', region: "N'Djaména", city: "N'Djaména", lat: 12.11, lng: 15.05 },
    { country: 'TD', region: 'Logone Occidental', city: 'Moundou', lat: 8.56, lng: 16.08 },
    { country: 'TD', region: 'Moyen-Chari', city: 'Sarh', lat: 9.14, lng: 18.39 }
  ],

  CF: [
    { country: 'CF', region: 'Bangui', city: 'Bangui', lat: 4.36, lng: 18.58 },
    { country: 'CF', region: 'Mambéré-Kadéï', city: 'Berbérati', lat: 4.26, lng: 15.79 }
  ]
}

/**
 * Calcule la zone urbaine la plus proche des coordonnées GPS données.
 */
export function findNearestGeoZone(lat: number, lng: number, countryCode = 'CM'): GeoZone {
  const zones = COUNTRY_GEO_ZONES[countryCode?.toUpperCase()] || COUNTRY_GEO_ZONES.CM || []
  if (zones.length === 0) {
    return { country: countryCode, region: '', city: '', lat, lng }
  }

  let best = zones[0]!
  let bestDist = Infinity

  for (const z of zones) {
    const d = Math.hypot(lat - z.lat, lng - z.lng)
    if (d < bestDist) {
      bestDist = d
      best = z
    }
  }

  return best
}

/**
 * Coordonnées des quartiers majeurs des métropoles (Douala, Yaoundé, etc.)
 * Utilisées pour estimer précisément la distance des entreprises de l'annuaire
 * et appliquer le filtre de rayon géographique (ex: 5 km, 10 km).
 */
export const CITY_QUARTERS_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // ── Douala ──
  akwa: { lat: 4.051, lng: 9.695 },
  bonanjo: { lat: 4.043, lng: 9.689 },
  bali: { lat: 4.038, lng: 9.693 },
  deido: { lat: 4.065, lng: 9.711 },
  bonapriso: { lat: 4.032, lng: 9.697 },
  bepanda: { lat: 4.062, lng: 9.731 },
  'new bell': { lat: 4.03, lng: 9.715 },
  makea: { lat: 4.03, lng: 9.715 },
  makepe: { lat: 4.083, lng: 9.742 },
  bonamoussadi: { lat: 4.088, lng: 9.735 },
  kotto: { lat: 4.095, lng: 9.755 },
  logpom: { lat: 4.081, lng: 9.771 },
  logbessou: { lat: 4.098, lng: 9.789 },
  ndogbong: { lat: 4.058, lng: 9.748 },
  bassa: { lat: 4.048, lng: 9.745 },
  'pk 8': { lat: 4.048, lng: 9.745 },
  pk8: { lat: 4.048, lng: 9.745 },
  'pk 9': { lat: 4.052, lng: 9.752 },
  'pk 10': { lat: 4.056, lng: 9.76 },
  'pk 12': { lat: 4.065, lng: 9.775 },
  'pk 14': { lat: 4.075, lng: 9.79 },
  ndogpassi: { lat: 4.015, lng: 9.765 },
  nyalla: { lat: 4.028, lng: 9.775 },
  yassa: { lat: 3.998, lng: 9.805 },
  bonaberi: { lat: 4.075, lng: 9.665 },
  bonaneri: { lat: 4.075, lng: 9.665 },
  'mbanga bakoko': { lat: 4.005, lng: 9.815 },
  bekoko: { lat: 4.145, lng: 9.615 },
  bomono: { lat: 4.152, lng: 9.605 },
  yabassi: { lat: 4.042, lng: 9.712 },

  // ── Yaoundé ──
  bastos: { lat: 3.895, lng: 11.512 },
  mokolo: { lat: 3.878, lng: 11.498 },
  tsinga: { lat: 3.885, lng: 11.502 },
  biyem: { lat: 3.838, lng: 11.485 },
  'biyem-assi': { lat: 3.838, lng: 11.485 },
  mendong: { lat: 3.825, lng: 11.472 },
  mvan: { lat: 3.815, lng: 11.515 },
  nsam: { lat: 3.832, lng: 11.505 },
  etoudi: { lat: 3.91, lng: 11.53 },
  omnisports: { lat: 3.875, lng: 11.535 },
  essos: { lat: 3.872, lng: 11.54 },
  emana: { lat: 3.925, lng: 11.528 },
  messassi: { lat: 3.945, lng: 11.535 },
  olembe: { lat: 3.955, lng: 11.542 }
}

/**
 * Calcule la distance orthodromique (Haversine) en kilomètres entre deux coordonnées GPS.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Formate une distance pour affichage utilisateur (ex: "850 m", "2.4 km").
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.max(50, Math.round(distanceKm * 1000))} m`
  }
  return `${distanceKm.toFixed(1)} km`
}

/**
 * Tente d'estimer les coordonnées d'une entreprise à partir de son adresse ou nom de quartier.
 */
export function resolveCompanyCoordinates(company: {
  adresse?: string | null
  city?: string | null
  region?: string | null
  raisonSociale?: string | null
}): { lat: number; lng: number } | null {
  const text = `${company.adresse || ''} ${company.raisonSociale || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  for (const [quarter, coords] of Object.entries(CITY_QUARTERS_COORDINATES)) {
    const regex = new RegExp(`\\b${quarter}\\b`, 'i')
    if (regex.test(text)) {
      return coords
    }
  }

  // Fallback si la ville est connue dans le référentiel urbain
  if (company.city) {
    const normCity = company.city.toLowerCase().trim()
    for (const zones of Object.values(COUNTRY_GEO_ZONES)) {
      const match = zones.find((z) => z.city.toLowerCase() === normCity)
      if (match) {
        return { lat: match.lat, lng: match.lng }
      }
    }
  }

  return null
}

