/**
 * api-admin-auth.ts
 *
 * Helper pour vérifier si un utilisateur est admin, avec cache in-memory
 * pour éviter de lire le document Firestore à chaque requête API admin.
 *
 * Économie : sans cache = 1 lecture Firestore par appel API admin.
 * Avec cache : 0 lecture supplémentaire pendant 5 minutes.
 */

import { adminAuth, adminDb } from '@/lib/firebase-admin'

const ROLE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  role: string
  expiresAt: number
}

// Cache en mémoire process — partagé entre les invocations Next.js (warm instance)
const roleCache = new Map<string, CacheEntry>()

/**
 * Vérifie que le token est valide et que l'utilisateur a le rôle 'admin'.
 * Utilise un cache in-memory pour éviter de relire Firestore à chaque requête.
 *
 * @throws Error('unauthenticated') si le token est absent ou invalide
 * @throws Error('forbidden') si l'utilisateur n'est pas admin
 */
export async function verifyAdminCached(token: string | null | undefined): Promise<string> {
  if (!token) throw new Error('unauthenticated')

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    uid = decoded.uid
  } catch {
    throw new Error('unauthenticated')
  }

  const now = Date.now()

  // ── Servir depuis le cache si disponible et non expiré ────────────────────
  const cached = roleCache.get(uid)
  if (cached && now < cached.expiresAt) {
    if (cached.role !== 'admin') throw new Error('forbidden')
    return uid
  }

  // ── Lecture Firestore uniquement si cache expiré ou absent ────────────────
  const userDoc = await adminDb.collection('users').doc(uid).get()
  const role = userDoc.data()?.role ?? 'member'

  // Mettre en cache
  roleCache.set(uid, { role, expiresAt: now + ROLE_CACHE_TTL_MS })

  // Nettoyer les entrées expirées (évite la croissance illimitée du Map)
  if (roleCache.size > 200) {
    for (const [key, entry] of roleCache.entries()) {
      if (now > entry.expiresAt) roleCache.delete(key)
    }
  }

  if (role !== 'admin') throw new Error('forbidden')
  return uid
}
