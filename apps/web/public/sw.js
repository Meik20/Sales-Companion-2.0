// Service Worker for Sales Companion PWA
// v11 — Strict "Default Deny" strategy for zero risk of private/stale data leakage
const CACHE_NAME = 'sales-companion-v11'

// Listen for explicit skip waiting request
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Core app shell — public, anonymous static assets only
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png'
]

// The ONLY navigation route allowed in cache is the public landing page.
// Everything else is treated as private by default (Refus par défaut).
const CACHEABLE_PUBLIC_NAVIGATIONS = new Set(['/'])

// Static asset file extensions allowed in cache
const STATIC_ASSET_REGEX = /\.(?:css|js|mjs|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|ico|gif)$/i

function isStaticAssetRequest(url) {
  const { pathname } = url
  if (pathname.startsWith('/_next/static/')) return true
  if (pathname.startsWith('/icons/') || pathname.startsWith('/illustrations/')) return true
  if (STATIC_ASSETS.includes(pathname)) return true
  return STATIC_ASSET_REGEX.test(pathname)
}

// Install — cache static assets + public landing page only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Static assets (blocking)
      await cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache static assets:', err)
      })
      // 2. Public landing page (best effort)
      try {
        const res = await fetch('/', { credentials: 'same-origin' })
        if (res.ok && res.status < 300) {
          await cache.put('/', res)
        }
      } catch {
        // Silently ignore pre-fetch failure (e.g. offline during install)
      }
    })
  )
  self.skipWaiting()
})

// Activate — purge old caches (including v9 and v10)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name)
        })
      )
    )
  )
  self.clients.claim()
})

// Fetch — smart routing per request type with strict DEFAULT-DENY
self.addEventListener('fetch', (event) => {
  const { request } = event
  const { method } = request
  const url = new URL(request.url)

  // ── 1. Never intercept non-GET requests (POST, PUT, DELETE, etc.)
  if (method !== 'GET') return

  // ── 2. Skip external / third-party requests
  if (url.origin !== self.location.origin) return

  // ── 3. API calls — strictly Network Only, fallback to offline JSON (never cached)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ message: 'Vous êtes hors ligne.', offline: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          })
      )
    )
    return
  }

  // ── 4. Next.js App Router RSC payloads & Server Actions — strictly Network Only
  //    Never cache dynamic JSON/RSC payloads that may contain personal user data
  if (request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) {
    event.respondWith(
      fetch(request).catch(
        () => new Response('Offline', { status: 503 })
      )
    )
    return
  }

  // ── 5. HTML Navigations — STRICT "DEFAULT DENY"
  if (request.mode === 'navigate') {
    // Only the public landing page is allowed to be served/updated via cache
    if (CACHEABLE_PUBLIC_NAVIGATIONS.has(url.pathname)) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          const cached = await cache.match(request)

          // Background revalidation for landing page
          const networkFetch = fetch(request)
            .then((response) => {
              if (response.ok && response.status < 300) {
                cache.put(request, response.clone())
              }
              return response
            })
            .catch(() => null)

          if (cached) {
            networkFetch.catch(() => {})
            return cached
          }

          const networkResponse = await networkFetch
          if (networkResponse && networkResponse.ok) return networkResponse

          const offline = await cache.match('/offline.html')
          return offline || new Response('Offline', { status: 503 })
        })
      )
      return
    }

    // ALL OTHER PAGES (e.g. /search, /pipeline, /crm, /dashboard, /reporting,
    // /import, /ai, /upgrade, /profile, /settings, /admin, etc.):
    // STRICTLY NETWORK ONLY. Never cached. Never served from cache.
    // If offline on a private page, show the generic /offline.html page only.
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match('/offline.html')
        return offline || new Response('Offline', { status: 503 })
      })
    )
    return
  }

  // ── 6. Pure static assets (JS chunks, CSS, fonts, SVG icons, images)
  //    Cached using Cache-First, then Network.
  if (isStaticAssetRequest(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((c) => c.put(request, clone))
            }
            return response
          })
          .catch(() => new Response('Asset offline', { status: 503 }))
      })
    )
    return
  }

  // ── 7. Any other GET request — Default Deny: Pass directly to network, NEVER cache
  event.respondWith(fetch(request))
})


