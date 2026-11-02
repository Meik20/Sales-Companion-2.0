/**
 * offline-sync.ts
 * Gestion de la file d'attente hors-ligne (Offline Mutation Queue) pour les commerciaux terrain.
 * Permet de différer et synchroniser automatiquement les actions en cas de perte de connectivité (3G/EDGE/zones blanches).
 */

export interface QueuedOfflineMutation {
  id: string
  type: 'update_pipeline' | 'add_activity' | 'add_pipeline'
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH'
  payload: Record<string, unknown>
  description: string
  queuedAt: string
  retryCount: number
}

const STORAGE_KEY = 'SC_OFFLINE_MUTATION_QUEUE_V1'

/**
 * Récupère la liste des mutations en attente dans le stockage local
 */
export function getQueuedMutations(): QueuedOfflineMutation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as QueuedOfflineMutation[]
  } catch {
    return []
  }
}

/**
 * Enregistre une mutation dans la file d'attente hors-ligne
 */
export function enqueueOfflineMutation(
  mutation: Omit<QueuedOfflineMutation, 'id' | 'queuedAt' | 'retryCount'>
): QueuedOfflineMutation {
  const item: QueuedOfflineMutation = {
    ...mutation,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    queuedAt: new Date().toISOString(),
    retryCount: 0
  }

  if (typeof window !== 'undefined') {
    try {
      const current = getQueuedMutations()
      current.push(item)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
      window.dispatchEvent(new CustomEvent('sc-offline-queue-changed', { detail: { count: current.length } }))
    } catch (e) {
      console.warn('[enqueueOfflineMutation] Storage failed:', e)
    }
  }

  return item
}

/**
 * Supprime une mutation de la file après exécution réussie
 */
export function removeQueuedMutation(id: string): void {
  if (typeof window === 'undefined') return
  try {
    const current = getQueuedMutations().filter((m) => m.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    window.dispatchEvent(new CustomEvent('sc-offline-queue-changed', { detail: { count: current.length } }))
  } catch (e) {
    console.warn('[removeQueuedMutation] Storage update failed:', e)
  }
}

/**
 * Vide intégralement la file d'attente
 */
export function clearQueuedMutations(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('sc-offline-queue-changed', { detail: { count: 0 } }))
  } catch (e) {
    console.warn('[clearQueuedMutations] Storage clear failed:', e)
  }
}

/**
 * Rejoue toutes les mutations en attente séquentiellement dès que le réseau est disponible
 */
export async function processOfflineQueue(token?: string): Promise<{
  processed: number
  failed: number
  remaining: number
}> {
  const queue = getQueuedMutations()
  if (queue.length === 0) return { processed: 0, failed: 0, remaining: 0 }

  let processed = 0
  let failed = 0

  // Récupérer le token d'authentification si absent
  let authToken = token
  if (!authToken && typeof window !== 'undefined') {
    try {
      const { auth } = await import('@/services/firebase/client')
      authToken = (await auth.currentUser?.getIdToken()) || undefined
    } catch {
      // ignore
    }
  }

  for (const item of queue) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`
      }

      const res = await fetch(item.endpoint, {
        method: item.method,
        headers,
        body: JSON.stringify(item.payload)
      })

      if (res.ok) {
        removeQueuedMutation(item.id)
        processed++
      } else {
        // En cas d'erreur serveur persistante (ex: 400 validation), marquer retry
        item.retryCount = (item.retryCount || 0) + 1
        if (item.retryCount > 5) {
          // Supprimer les items définitivement invalides pour éviter un blocage
          removeQueuedMutation(item.id)
        }
        failed++
      }
    } catch (networkErr) {
      // Toujours hors ligne ou perte de connexion intermittente
      console.warn('[processOfflineQueue] Network still unreachable for item:', item.id, networkErr)
      failed++
      break // Interrompre la boucle si le réseau est toujours indisponible
    }
  }

  const remaining = getQueuedMutations().length
  return { processed, failed, remaining }
}

