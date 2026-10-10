import { NextRequest, NextResponse } from 'next/server'
import { COUNTRY_NAMES, type CountryCode } from '@sales-companion/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  let detected = (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code') ||
    ''
  ).toUpperCase()

  // Si aucun header de géolocalisation n'est présent (ex: dev local, environnement de test),
  // on interroge un service léger de géolocalisation IP avec un timeout court (1500ms).
  if (!detected) {
    try {
      const clientIp =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        ''
      const url = clientIp && !clientIp.startsWith('127.') && !clientIp.startsWith('192.168.') && !clientIp.startsWith('10.')
        ? `https://api.country.is/${clientIp}`
        : 'https://api.country.is'

      const res = await fetch(url, {
        signal: AbortSignal.timeout(1500),
        headers: { Accept: 'application/json' }
      })
      if (res.ok) {
        const data = (await res.json()) as { country?: string }
        if (data.country) {
          detected = data.country.toUpperCase()
        }
      }
    } catch {
      // Ignorer l'erreur réseau et basculer sur le fallback
    }
  }

  // Règle d'or : si le pays est l'un des 7 supportés, on le retient. Sinon, Cameroun priorisé.
  const resolvedCountry: CountryCode = (detected && COUNTRY_NAMES[detected as CountryCode])
    ? (detected as CountryCode)
    : 'CM'

  const response = NextResponse.json(
    { country: resolvedCountry },
    {
      headers: { 'Cache-Control': 'private, max-age=3600' }
    }
  )

  // Positionner le cookie pour les requêtes client et SSR ultérieures
  response.cookies.set('sc_country', resolvedCountry, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })

  return response
}
