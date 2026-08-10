export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminCached } from '@/lib/api-admin-auth'

// ── Cache in-memory (TTL 15 min) ──────────────────────────────────────────────
// Évite de relancer des scans massifs de la collection companies à chaque appel.
// Le coût Firestore d'un scan complet = 1 lecture × nb_entreprises (ex : 10 000
// entreprises = 10 000 lectures à chaque visite de la page admin/companies).
type CompanyStatsCache = {
  data: { bySector: { sector: string; count: number }[]; byRegion: { region: string; count: number }[]; total: number }
  expiresAt: number
}
let statsCache: CompanyStatsCache | null = null
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

// Principaux secteurs connus — ajouter ici si de nouveaux secteurs apparaissent
const KNOWN_SECTORS = [
  'Commerce',
  'BTP & Construction',
  'Industrie manufacturière',
  'Agriculture & Agroalimentaire',
  'Services & Conseil',
  'Transport & Logistique',
  'Hôtellerie & Restauration',
  'Santé',
  'Éducation & Formation',
  'Technologies & Numérique',
  'Finance & Assurance',
  'Énergie & Mines',
  'Non spécifié'
]

// Principales villes/régions
const KNOWN_CITIES = [
  'Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua',
  'Ngaoundéré', 'Maroua', 'Bertoua', 'Ebolowa', 'Buea',
  'Limbe', 'Kumba', 'Nkongsamba', 'Edéa', 'Mbalmayo'
]

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    try {
      await verifyAdminCached(token)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'unauthenticated') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // ── Servir depuis le cache si encore valide ───────────────────────────────
    const now = Date.now()
    if (statsCache && now < statsCache.expiresAt) {
      return NextResponse.json(statsCache.data)
    }

    // ── Calcul via count() par secteur et par ville (pas de scan massif) ─────
    // Chaque count() = 1 opération d'index Firestore (quel que soit le nb de docs)
    const [sectorCounts, cityCounts, totalSnap] = await Promise.all([
      Promise.all(
        KNOWN_SECTORS.map(async (sector) => ({
          sector,
          count: (
            await adminDb.collection('companies').where('sector', '==', sector).count().get()
          ).data().count
        }))
      ),
      Promise.all(
        KNOWN_CITIES.map(async (city) => ({
          region: city,
          count: (
            await adminDb.collection('companies').where('city', '==', city).count().get()
          ).data().count
        }))
      ),
      adminDb.collection('companies').count().get()
    ])

    const bySector = sectorCounts
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)

    const byRegion = cityCounts
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)

    const total = totalSnap.data().count

    const result = { bySector, byRegion, total }

    // Mettre en cache pour 15 minutes
    statsCache = { data: result, expiresAt: now + CACHE_TTL_MS }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Company stats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

