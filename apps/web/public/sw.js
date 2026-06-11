// Service Worker for Sales Companion PWA
// v5 — adds apis.google.com and gstatic.com to bypass, forces cache clear
const CACHE_NAME = 'sales-companion-v5'
const STATIC_ASSETS = ['/offline.html']

// Install — cache minimal static assets only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err)
      })
    )
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

// Fetch — network first for everything; NO caching of API/POST responses
self.addEventListener('fetch', (event) => {
  const { request } = event
  const { method, url } = request

  // ── 1. Never intercept non-GET requests (POST, PUT, DELETE…)
  //    This was the root cause of the 405 and clone errors
  if (method !== 'GET') return

  // ── 2. Skip all external/third-party requests — let the browser handle them natively
  //    This prevents the SW from applying stale CSP rules to external scripts
  const appOrigin = self.location.origin
  if (!url.startsWith(appOrigin)) return

  // ── 3. API calls — network only, NEVER cache (avoids the clone bug)
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

  // ── 4. HTML navigation — network first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone BEFORE reading, store clone in cache, return original
          if (response.ok && response.status < 300) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          const offline = await caches.match('/offline.html')
          return offline || new Response('Offline', { status: 503 })
        })
    )
    return
  }

  // ── 5. Static assets — cache first, then network
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
