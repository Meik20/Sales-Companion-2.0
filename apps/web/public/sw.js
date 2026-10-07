// Service Worker for Sales Companion PWA
// v10 — Public shell only; private routes are NEVER cached
const CACHE_NAME = 'sales-companion-v10'

// Listen for explicit skip waiting request
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Core app shell — public, anonymous assets only
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png'
]

// Only the public landing page is pre-cached.
// /search, /pipeline, /profile, /settings, /saved are private —
// they require authentication and must NOT be served from cache.
const APP_ROUTES = ['/']

// Routes that belong to authenticated sessions — NEVER cache these.
// Add new private paths here as the app grows.
const PRIVATE_ROUTE_PREFIXES = [
  '/search',
  '/pipeline',
  '/profile',
  '/settings',
  '/saved',
  '/admin',
  '/team',
  '/crm',
  '/imports',
  '/notifications',
  '/billing'
]

function isPrivateRoute(url) {
  try {
    const { pathname } = new URL(url)
    return PRIVATE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  } catch {
    return false
  }
}

// Install — cache static assets + public app shell only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache static assets (must-have, blocking)
      const staticPromise = cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some static assets:', err)
      })
      // Pre-fetch public routes only (best-effort, non-blocking)
      const routePromises = APP_ROUTES.map((route) =>
        fetch(route, { credentials: 'same-origin' })
          .then((response) => {
            if (response.ok && response.status < 300) {
              return cache.put(route, response)
            }
          })
          .catch(() => {
            // Silently ignore pre-fetch failures (network may be unavailable)
          })
      )
      return Promise.all([staticPromise, ...routePromises])
    })
  )
  self.skipWaiting()
})

// Activate — remove old caches
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

// Fetch — smart routing per request type
self.addEventListener('fetch', (event) => {
  const { request } = event
  const { method, url } = request

  // ── 1. Never intercept non-GET requests (POST, PUT, DELETE…)
  if (method !== 'GET') return

  // ── 2. Skip external/third-party requests
  const appOrigin = self.location.origin
  if (!url.startsWith(appOrigin)) return

  // ── 3. API calls — network only, fallback to JSON error (never cache)
  if (url.includes('/api/')) {
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

  // ── 4. Private authenticated routes — NETWORK ONLY, never cache.
  //    This prevents personal data from being served on shared devices
  //    after logout or account switching.
  if (request.mode === 'navigate' && isPrivateRoute(url)) {
    event.respondWith(
      fetch(request).catch(async () => {
        // Offline: never serve a stale private page — redirect to offline page
        const offline = await caches.match('/offline.html')
        return offline || new Response('Offline', { status: 503 })
      })
    )
    return
  }

  // ── 5. Public HTML navigation — Cache First + background revalidation
  //    Only reached for non-private navigations (e.g. landing page, /auth/*)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)

        // Background revalidation: always try to refresh the cache
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok && response.status < 300) {
              cache.put(request, response.clone())
            }
            return response
          })
          .catch(() => null)

        if (cached) {
          // Serve cached version immediately; network updates happen in bg
          networkFetch.catch(() => {})
          return cached
        }

        // Nothing in cache — wait for network
        const networkResponse = await networkFetch
        if (networkResponse && networkResponse.ok) return networkResponse

        // Network failed + no cache → check for a cached variant of this URL
        const anyMatch = await cache.match(request.url)
        if (anyMatch) return anyMatch

        // Last resort: offline page
        const offline = await cache.match('/offline.html')
        return offline || new Response('Offline', { status: 503 })
      })
    )
    return
  }

  // ── 6. Illustrations & images — network first, cache fallback
  if (url.includes('/illustrations/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || new Response('Asset offline', { status: 503 })
        })
    )
    return
  }

  // ── 7. Other static assets (fonts, icons, etc.) — cache first, then network
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
        .catch(() => new Response('Network error', { status: 503 }))
    })
  )
})

