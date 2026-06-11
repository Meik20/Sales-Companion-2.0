import { NextRequest, NextResponse } from 'next/server'

// ── Legitimate search engine bots — NEVER block these ───────────────────────────
const ALLOWED_BOTS = [
  /googlebot/i,
  /google-inspectiontool/i,
  /adsbot-google/i,
  /bingbot/i,
  /slurp/i,        // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebot/i,
  /ia_archiver/i
]

// ── Bot / Scraper User-Agent patterns (malicious) ─────────────────────────────────────────
const BOT_UA_PATTERNS = [
  // Generic crawlers & scrapers
  /crawl/i,
  /spider/i,
  /scraper/i,
  /python-requests/i,
  /node-fetch/i,
  /axios/i,
  /curl/i,
  /wget/i,
  /httpie/i,
  /go-http-client/i,
  /java\/\d/i,
  /ruby/i,
  /php/i,
  /perl/i,
  /libwww/i,
  /lwp/i,
  /mechanize/i,
  // Known scraping tools
  /scrapy/i,
  /selenium/i,
  /playwright/i,
  /puppeteer/i,
  /headless/i,
  /phantomjs/i,
  /jsdom/i,
  /cheerio/i,
  // SEO audit bots (commercial scrapers)
  /ahrefs/i,
  /semrush/i,
  /mj12bot/i,
  /dotbot/i,
  /dataforseo/i,
  /rogerbot/i,
  /exabot/i,
  /blexbot/i
]

// ── In-memory IP rate limiter (Edge-compatible, per-instance) ─────────────────
const ipStore = new Map<string, { count: number; resetAt: number }>()
const API_RATE_LIMIT = 200      // ← augmenté (était 60)
const API_RATE_WINDOW = 60_000  // 1 minute
const SEARCH_RATE_LIMIT = 30    // ← augmenté (était 10)
const SEARCH_RATE_WINDOW = 10_000 // 10 secondes

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
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const ua = req.headers.get('user-agent') ?? ''
  const ip = getClientIp(req)

  // ── 1. Always allow legitimate search engine crawlers ─────────────────────
  const isAllowedBot = ALLOWED_BOTS.some((pattern) => pattern.test(ua))
  if (isAllowedBot) return NextResponse.next()

  // ── 2. Block known malicious bots / scrapers ────────────────────────────────
  const isBot = BOT_UA_PATTERNS.some((pattern) => pattern.test(ua))
  if (isBot) {
    return new NextResponse('Access denied', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  // ── 2. Require non-empty User-Agent on API routes ─────────────────────────
  if (pathname.startsWith('/api/') && !ua.trim()) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // ── 3. Rate limiting sur routes API (skip si authentifié) ─────────────────
  if (pathname.startsWith('/api/')) {
    const authHeader = req.headers.get('authorization') ?? ''

    // Les requêtes avec token Bearer sont déjà authentifiées → pas de rate limit
    if (!authHeader.startsWith('Bearer ')) {
      const isSearch = pathname.includes('/search')
      const limit = isSearch ? SEARCH_RATE_LIMIT : API_RATE_LIMIT
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
              'Retry-After': '60'
            }
          }
        )
      }
    }
  }

  // ── 4. Anti-scraping response headers ─────────────────────────────────────
  const response = NextResponse.next()
  // NOTE: X-Robots-Tag is managed per-route in next.config.ts — do NOT set globally here
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')

  return response
}

export default proxy

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|manifest|icons|sw\.js|workbox).*)']
}