/**
 * IndexedDB cache for company search results.
 * Allows users to review previously searched businesses while offline.
 */

const DB_NAME = 'sc_offline_search_db'
const DB_VERSION = 1
const STORE_NAME = 'cached_searches'
const MAX_CACHE_ENTRIES = 50
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface CachedSearchRecord {
  key: string
  filters: Record<string, any>
  results: any[]
  total?: number
  timestamp: number
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.warn('[search-cache] Failed to open IndexedDB:', request.error)
      resolve(null)
    }
  })
}

export function generateSearchKey(filters: Record<string, any>): string {
  const sortedKeys = Object.keys(filters).sort()
  const normalized: Record<string, any> = {}
  for (const k of sortedKeys) {
    const v = filters[k]
    if (v !== undefined && v !== null && v !== '') {
      normalized[k] = v
    }
  }
  return JSON.stringify(normalized)
}

export async function saveSearchResults(
  filters: Record<string, any>,
  results: any[],
  total?: number
): Promise<void> {
  try {
    const db = await openDB()
    if (!db) return

    const key = generateSearchKey(filters)
    const record: CachedSearchRecord = {
      key,
      filters,
      results,
      total: total ?? results.length,
      timestamp: Date.now()
    }

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(record)

    tx.oncomplete = () => {
      db.close()
      pruneOldCache()
    }
  } catch (err) {
    console.warn('[search-cache] Could not save search results:', err)
  }
}

export async function getCachedSearchResults(
  filters: Record<string, any>
): Promise<CachedSearchRecord | null> {
  try {
    const db = await openDB()
    if (!db) return null

    const key = generateSearchKey(filters)

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)

      req.onsuccess = () => {
        db.close()
        const record = req.result as CachedSearchRecord | undefined
        if (!record) {
          resolve(null)
          return
        }

        // Check TTL
        if (Date.now() - record.timestamp > TTL_MS) {
          resolve(null)
          return
        }

        resolve(record)
      }

      req.onerror = () => {
        db.close()
        resolve(null)
      }
    })
  } catch (err) {
    console.warn('[search-cache] Error getting cached search:', err)
    return null
  }
}

export async function getRecentCachedSearches(): Promise<CachedSearchRecord[]> {
  try {
    const db = await openDB()
    if (!db) return []

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('timestamp')
      const req = index.openCursor(null, 'prev')
      const list: CachedSearchRecord[] = []

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue | null
        if (cursor && list.length < 20) {
          list.push(cursor.value)
          cursor.continue()
        } else {
          db.close()
          resolve(list)
        }
      }

      req.onerror = () => {
        db.close()
        resolve([])
      }
    })
  } catch {
    return []
  }
}

async function pruneOldCache() {
  try {
    const db = await openDB()
    if (!db) return

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    const req = index.openCursor(null, 'prev')
    let count = 0

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue | null
      if (cursor) {
        count++
        if (count > MAX_CACHE_ENTRIES || Date.now() - cursor.value.timestamp > TTL_MS) {
          cursor.delete()
        }
        cursor.continue()
      } else {
        db.close()
      }
    }
  } catch {
    // Ignore prune errors
  }
}
