// Service Worker - Cache & Offline Support
const CACHE_NAME = 'sales-companion-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('[SW] Some assets could not be cached:', err);
        // Don't fail install if some assets fail
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests - let them fail naturally
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Enhanced fetch strategy: cache-first for static, network-first for API
  const isApiRequest = event.request.url.includes('/api/');

  if (isApiRequest) {
    // Network-first for API requests
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Try to return cached response, otherwise 503 Offline
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            console.log('[SW] Offline - no cached API response:', event.request.url);
            return new Response('Offline - Service unavailable', { 
              status: 503, 
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
          });
        })
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches
        .match(event.request)
        .then((response) => {
          // Return cached response if found
          if (response) {
            return response;
          }

          // Try to fetch from network
          return fetch(event.request).then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Cache successful responses
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          });
        })
        .catch(() => {
          // Return offline response
          console.log('[SW] Offline - no cached response:', event.request.url);
          return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        })
    );
  }
});
