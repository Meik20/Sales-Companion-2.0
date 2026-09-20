// Service Worker for Sales Companion PWA
// v8 — Cache-first for app shell + stale-while-revalidate navigation
const CACHE_NAME = 'sales-companion-v8'

// Core app shell routes pre-cached at install time
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png'
]

// App routes pre-cached so the app works offline from first visit
const APP_ROUTES = ['/', '/search', '/pipeline', '/saved', '/profile', '/settings']

// Install — cache static assets + app shell routes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache static assets (must-have, blocking)
      const staticPromise = cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some static assets:', err)
      })
      // Pre-fetch app routes (best-effort, non-blocking)
      const routePromises = APP_ROUTES.map((route) =>
        fetch(route, { credentials: 'same-origin' })
          .then((response) => {
            if (response.ok && response.status < 300) {
              return cache.put(route, response)
            }
          })
          .catch(() => {
            // Silently ignore pre-fetch failures (user may not be logged in yet)
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

  // ── 4. HTML navigation — Cache First + background revalidation
  //    This is the KEY fix: serve from cache immediately so app loads
  //    without network. Silently update cache in the background.
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

  // ── 5. Illustrations & images — network first, cache fallback
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

  // ── 6. Other static assets (fonts, icons, etc.) — cache first, then network
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
