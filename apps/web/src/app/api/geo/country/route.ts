import { NextRequest, NextResponse } from 'next/server'
import { COUNTRY_NAMES } from '@sales-companion/shared'

export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  const detected = (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code') ||
    ''
  ).toUpperCase()

  return NextResponse.json({ country: COUNTRY_NAMES[detected] ? detected : 'CM' }, {
    headers: { 'Cache-Control': 'private, max-age=3600' }
  })
}