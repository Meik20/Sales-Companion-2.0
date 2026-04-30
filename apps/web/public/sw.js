// Service Worker for Sales Companion PWA
// Handles caching, offline support, and background sync

const CACHE_NAME = 'sales-companion-v1'
const STATIC_ASSETS = [
  '/',
  '/search',
  '/pipeline',
  '/profile',
  '/offline.html',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const { method, url } = request

  // Skip non-GET requests
  if (method !== 'GET') {
    return
  }

  // Skip chrome extensions and external requests
  if (url.includes('chrome-extension://') || url.includes('extension://')) {
    return
  }

  // API calls - network first, fallback to error response
  if (url.includes('/api/') || url.includes('localhost:8000')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const cache = caches.open(CACHE_NAME).then((c) => c.put(request, response.clone()))
          }
          return response
        })
        .catch(() => {
          // Return offline error for API calls
          return new Response(
            JSON.stringify({
              message: 'Vous êtes hors ligne. Cette fonctionnalité n\'est pas disponible.',
              offline: true,
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        })
    )
    return
  }

  // Static assets and pages - cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const clonedResponse = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback for failed requests
          if (request.destination === 'document') {
            return caches.match('/offline.html').then((response) => {
              return response || new Response('Offline - Page not cached')
            })
          }
          return new Response('Network error - Resource not available')
        })
    })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions())
  }
})

async function syncPendingActions() {
  try {
    // Get pending actions from IndexedDB
    const db = await openDatabase()
    const pending = await getPendingActions(db)

    if (pending.length === 0) {
      return
    }

    console.log('[SW] Syncing pending actions:', pending.length)

    // Retry pending actions
    for (const action of pending) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        })

        if (response.ok) {
          await removePendingAction(db, action.id)
          console.log('[SW] Synced action:', action.id)
        }
      } catch (error) {
        console.error('[SW] Failed to sync action:', action.id, error)
      }
    }

    // Notify clients about sync completion
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        count: pending.length,
      })
    })
  } catch (error) {
    console.error('[SW] Sync failed:', error)
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SalesCompanion', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('pending-actions')) {
        db.createObjectStore('pending-actions', { keyPath: 'id' })
      }
    }
  })
}

function getPendingActions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-actions'], 'readonly')
    const store = transaction.objectStore('pending-actions')
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function removePendingAction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-actions'], 'readwrite')
    const store = transaction.objectStore('pending-actions')
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}
