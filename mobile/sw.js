const CACHE = 'sc-v1.2.0'; // Version bump for update detection
const ASSETS = ['/', '/index.html', '/mobile', '/mobile/index.html', '/landing.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();

  // Notify clients about service worker activation
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_ACTIVATED', version: CACHE });
    });
  });
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/') || e.request.url.includes('/auth/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).catch(async () => {
        if (e.request.destination === 'document' || (e.request.headers.get('accept') || '').includes('text/html')) {
          return caches.match('/mobile') || caches.match('/mobile/index.html') || caches.match('/index.html');
        }
      });
    })
  );
});

// Handle messages from the main app
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (e.data && e.data.type === 'GET_VERSION') {
    e.ports[0].postMessage({ version: CACHE });
  }
});
