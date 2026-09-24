import { Query, QuerySnapshot, getDocs, getDocsFromCache } from 'firebase/firestore'
import { isMobileRuntime } from '@/lib/runtime'

/**
 * Execute a Firestore query with offline fallback.
 * If the user is offline or the network call fails, it immediately retrieves
 * results from the local IndexedDB persistent cache.
 */
export async function getDocsWithOfflineFallback(q: Query): Promise<QuerySnapshot> {
  const isOffline = isMobileRuntime() && typeof navigator !== 'undefined' && !navigator.onLine

  if (isOffline) {
    try {
      const snap = await getDocsFromCache(q)
      return snap
    } catch {
      // In case getDocsFromCache throws (e.g. initial setup), try standard getDocs
      return await getDocs(q)
    }
  }

  try {
    return await getDocs(q)
  } catch (networkError) {
    if (!isMobileRuntime()) throw networkError
    try {
      return await getDocsFromCache(q)
    } catch {
      throw networkError
    }
  }
}

/**
 * Normalizes Firestore timestamps (Timestamp object, Date, string, null) to ISO string
 */
export function formatTimestamp(val: any): string | null {
  if (!val) return null
  if (typeof val?.toDate === 'function') {
    return val.toDate().toISOString()
  }
  if (val instanceof Date) {
    return val.toISOString()
  }
  if (typeof val === 'string') {
    return val
  }
  return null
}
