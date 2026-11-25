export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseShortcutCounts } from '@/lib/supabase-companies'

const HIGHLIGHT_CITIES: Record<string, { btp: string; tech: string }> = {
  CM: { btp: 'Douala', tech: 'Yaoundé' },
  SN: { btp: 'Dakar', tech: 'Dakar' },
  CI: { btp: 'Abidjan', tech: 'Abidjan' },
  BJ: { btp: 'Cotonou', tech: 'Cotonou' },
  TG: { btp: 'Lomé', tech: 'Lomé' },
  TD: { btp: "N'Djamena", tech: "N'Djamena" },
  CF: { btp: 'Bangui', tech: 'Bangui' }
}

/**
 * GET /api/search/shortcuts-counts?country=CM
 * Retourne les compteurs réels d'entreprises en base Supabase pour les raccourcis de recherche.
 * Ne consomme aucun crédit. Retourne 0 si aucune donnée en base pour ce pays.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawCountry = (searchParams.get('country') || 'CM').trim().toUpperCase()
    const countryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : 'CM'
    const cities = HIGHLIGHT_CITIES[countryCode]

    const counts = await getSupabaseShortcutCounts({
      countryCode,
      btpCity: cities?.btp,
      techCity: cities?.tech
    })

    return NextResponse.json(
      { countryCode, ...counts },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
        }
      }
    )
  } catch (error) {
    console.error('[shortcuts-counts] error:', error)
    return NextResponse.json(
      {
        countryCode: null,
        pills: { btp: 0, commerce: 0, tech: 0, agro: 0, transport: 0, sante: 0 },
        cards: { btpCity: 0, techCity: 0, agro: 0, transport: 0 }
      },
      { status: 200 }
    )
  }
}
