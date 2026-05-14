import { NextRequest, NextResponse } from 'next/server'

// ── Bot / Scraper User-Agent patterns ─────────────────────────────────────────
const BOT_UA_PATTERNS = [
  // Generic crawlers & scrapers
  /bot/i, /crawl/i, /spider/i, /scraper/i, /python-requests/i,
  /node-fetch/i, /axios/i, /curl/i, /wget/i, /httpie/i,
  /go-http-client/i, /java\/\d/i, /ruby/i, /php/i,
  /perl/i, /libwww/i, /lwp/i, /mechanize/i,
  // Known scraping tools
  /scrapy/i, /selenium/i, /playwright/i, /puppeteer/i, /headless/i,
  /phantomjs/i, /jsdom/i, /cheerio/i,
  // SEO & indexing bots
  /ahrefs/i, /semrush/i, /mj12bot/i, /dotbot/i, /dataforseo/i,
  /rogerbot/i, /exabot/i, /blexbot/i,
  // Archives
  /archive\.org/i, /ia_archiver/i,
]

// ── In-memory IP rate limiter (Edge-compatible, per-instance) ─────────────────
// Key: IP, Value: { count, resetAt }
const ipStore = new Map<string, { count: number; resetAt: number }>()
const API_RATE_LIMIT = 60       // max requests per window
const API_RATE_WINDOW = 60_000  // 1 minute window (ms)
const SEARCH_RATE_LIMIT = 10    // tighter for search endpoints
const SEARCH_RATE_WINDOW = 10_000 // 10 seconds

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = ipStore.get(key)

  if (!entry || now > entry.resetAt) {
    ipStore.set(key, { count: 1, resetAt: now + windowMs })
    return true // allowed
  }

  if (entry.count >= limit) return false // blocked

  entry.count++
  return true // allowed
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const ua = req.headers.get('user-agent') ?? ''
  const ip = getClientIp(req)

  // ── 1. Block known bots / scrapers ────────────────────────────────────────
  const isBot = BOT_UA_PATTERNS.some((pattern) => pattern.test(ua))
  if (isBot) {
    return new NextResponse('Access denied', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // ── 2. Require non-empty User-Agent on API routes ─────────────────────────
  if (pathname.startsWith('/api/') && !ua.trim()) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 3. Rate limiting on API routes ────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const isSearch = pathname.includes('/search')
    const limit  = isSearch ? SEARCH_RATE_LIMIT  : API_RATE_LIMIT
    const window = isSearch ? SEARCH_RATE_WINDOW : API_RATE_WINDOW

    const key = `${ip}:${isSearch ? 'search' : 'api'}`
    const allowed = checkRateLimit(key, limit, window)

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      )
    }
  }

  // ── 4. Block direct API access without Referer (non-browser scraping) ─────
  // Only apply to sensitive data routes (search, pipeline, admin)
  const sensitiveRoutes = ['/api/search/', '/api/pipeline', '/api/admin']
  const isSensitive = sensitiveRoutes.some((r) => pathname.startsWith(r))

  if (isSensitive) {
    const referer = req.headers.get('referer') ?? ''
    const origin  = req.headers.get('origin')  ?? ''
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sales-companion.app'

    const hasValidOrigin =
      referer.startsWith(appUrl) ||
      origin.startsWith(appUrl)  ||
      // Allow localhost in development
      referer.includes('localhost') ||
      origin.includes('localhost')

    if (!hasValidOrigin) {
      return new NextResponse(
        JSON.stringify({ error: 'Direct API access is not allowed.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }

  // ── 5. Add anti-scraping response headers ────────────────────────────────
  const response = NextResponse.next()
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')

  return response
}

export default proxy

export const config = {
  // Apply to all routes EXCEPT static files and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon|manifest|icons|sw\.js|workbox).*)',
  ],
}
