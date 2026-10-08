'use client'

import { useEffect } from 'react'
import { useQueryClient, QueryClient } from '@tanstack/react-query'
import * as firestoreModule from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { formatTimestamp } from '@/lib/firestore-offline'
import type { PipelineDoc } from '@sales-companion/shared'
import type { PipelineStats } from './usePipelineStats'

function formatPipelineDoc(
  id: string,
  data: Record<string, unknown>,
  fallbackUserId: string
): PipelineDoc & { id: string } {
  return {
    id,
    ...data,
    companyName: (data.companyName || data.name || '') as string,
    companyId: (data.companyId || id) as string,
    status: (data.status || 'prospection') as any,
    userId: (data.userId || fallbackUserId) as string,
    createdAt: formatTimestamp(data.createdAt) || new Date().toISOString(),
    updatedAt: formatTimestamp(data.updatedAt) || new Date().toISOString()
  } as unknown as PipelineDoc & { id: string }
}

function computeStats(items: (PipelineDoc & { id: string })[]): PipelineStats {
  const stats: PipelineStats = {
    total: items.length,
    prospection: 0,
    negotiation: 0,
    conclusion: 0,
    lost: 0,
    conversionRate: 0
  }

  items.forEach((item) => {
    const s = (item.status || '').toLowerCase()
    if (s === 'prospection' || s === 'prospect') stats.prospection++
    else if (s === 'negociation' || s === 'negotiation') stats.negotiation++
    else if (s === 'conclue' || s === 'conclusion') stats.conclusion++
    else if (s === 'lost' || s === 'perdu') stats.lost++
  })

  stats.conversionRate = stats.total > 0 ? Math.round((stats.conclusion / stats.total) * 100) : 0
  return stats
}

type SyncState = {
  uid: string
  role?: string
  refCount: number
  unsubscribers: (() => void)[]
  cleanupTimer: ReturnType<typeof setTimeout> | null
}

let activeSync: SyncState | null = null

function setupListeners(
  user: { uid: string; role?: string },
  queryClient: QueryClient
): (() => void)[] {
  const onSnapshot = (firestoreModule as any).onSnapshot
  const collection = (firestoreModule as any).collection
  const query = (firestoreModule as any).query
  const where = (firestoreModule as any).where

  if (typeof onSnapshot !== 'function' || typeof collection !== 'function' || !firestore) {
    return []
  }

  const isManager = user.role === 'manager'
  const unsubscribers: (() => void)[] = []

  if (isManager) {
    const teamDocs = new Map<string, Record<string, unknown>>()
    const ownDocs = new Map<string, Record<string, unknown>>()

    const publish = () => {
      const merged = new Map<string, Record<string, unknown>>()
      teamDocs.forEach((val, id) => merged.set(id, val))
      ownDocs.forEach((val, id) => {
        if (!merged.has(id)) merged.set(id, val)
      })

      const items = Array.from(merged.entries()).map(([id, data]) =>
        formatPipelineDoc(id, data, user.uid)
      )

      items.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0
        return tb - ta
      })

      queryClient.setQueryData(['manager-pipeline', user.uid], items)
      queryClient.setQueryData(['pipeline', user.uid], items)
      queryClient.setQueryData(['pipeline-stats', user.uid], computeStats(items))
    }

    try {
      const teamQ = query(collection(firestore, 'pipeline'), where('managerUid', '==', user.uid))
      const unsubTeam = onSnapshot(
        teamQ,
        (snapshot: any) => {
          teamDocs.clear()
          snapshot.docs.forEach((doc: any) => {
            teamDocs.set(doc.id, doc.data())
          })
          publish()
        },
        (error: any) => {
          console.warn('[usePipelineRealtimeSync] Manager team snapshot error:', error)
        }
      )
      unsubscribers.push(unsubTeam)
    } catch (e) {
      console.warn('[usePipelineRealtimeSync] Failed to attach manager team listener:', e)
    }

    try {
      const ownQ = query(collection(firestore, 'pipeline'), where('userId', '==', user.uid))
      const unsubOwn = onSnapshot(
        ownQ,
        (snapshot: any) => {
          ownDocs.clear()
          snapshot.docs.forEach((doc: any) => {
            ownDocs.set(doc.id, doc.data())
          })
          publish()
        },
        (error: any) => {
          console.warn('[usePipelineRealtimeSync] Manager own snapshot error:', error)
        }
      )
      unsubscribers.push(unsubOwn)
    } catch (e) {
      console.warn('[usePipelineRealtimeSync] Failed to attach manager own listener:', e)
    }
  } else {
    // Member / Independent
    const ownedDocs = new Map<string, Record<string, unknown>>()
    const assignedDocs = new Map<string, Record<string, unknown>>()

    const publish = () => {
      const merged = new Map<string, Record<string, unknown>>()
      ownedDocs.forEach((val, id) => merged.set(id, val))
      assignedDocs.forEach((val, id) => {
        if (!merged.has(id)) merged.set(id, val)
      })

      const items = Array.from(merged.entries()).map(([id, data]) =>
        formatPipelineDoc(id, data, user.uid)
      )

      items.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0
        return tb - ta
      })

      queryClient.setQueryData(['pipeline', user.uid], items)
      queryClient.setQueryData(['pipeline-stats', user.uid], computeStats(items))
    }

    try {
      const ownedQ = query(collection(firestore, 'pipeline'), where('userId', '==', user.uid))
      const unsubOwned = onSnapshot(
        ownedQ,
        (snapshot: any) => {
          ownedDocs.clear()
          snapshot.docs.forEach((doc: any) => {
            ownedDocs.set(doc.id, doc.data())
          })
          publish()
        },
        (error: any) => {
          console.warn('[usePipelineRealtimeSync] User owned snapshot error:', error)
        }
      )
      unsubscribers.push(unsubOwned)
    } catch (e) {
      console.warn('[usePipelineRealtimeSync] Failed to attach owned listener:', e)
    }

    try {
      const assignedQ = query(
        collection(firestore, 'pipeline'),
        where('assignedTo', '==', user.uid)
      )
      const unsubAssigned = onSnapshot(
        assignedQ,
        (snapshot: any) => {
          assignedDocs.clear()
          snapshot.docs.forEach((doc: any) => {
            assignedDocs.set(doc.id, doc.data())
          })
          publish()
        },
        (error: any) => {
          console.warn('[usePipelineRealtimeSync] User assigned snapshot error:', error)
        }
      )
      unsubscribers.push(unsubAssigned)
    } catch (e) {
      console.warn('[usePipelineRealtimeSync] Failed to attach assigned listener:', e)
    }
  }

  return unsubscribers
}

/**
 * Ensures real-time Firestore listeners are attached for the current user's pipeline.
 * Automatically synchronizes React Query cache in real time for:
 * - ['pipeline', user.uid]
 * - ['manager-pipeline', user.uid] (for managers)
 * - ['pipeline-stats', user.uid]
 *
 * Uses singleton ref-counting so multiple hook calls share the same listeners.
 */
export function usePipelineRealtimeSync() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user?.uid) return

    if (activeSync && activeSync.cleanupTimer) {
      clearTimeout(activeSync.cleanupTimer)
      activeSync.cleanupTimer = null
    }

    if (!activeSync || activeSync.uid !== user.uid || activeSync.role !== user.role) {
      if (activeSync) {
        activeSync.unsubscribers.forEach((u) => u())
      }
      const unsubs = setupListeners(user, queryClient)
      activeSync = {
        uid: user.uid,
        role: user.role,
        refCount: 1,
        unsubscribers: unsubs,
        cleanupTimer: null
      }
    } else {
      activeSync.refCount++
    }

    return () => {
      if (activeSync && activeSync.uid === user.uid) {
        activeSync.refCount--
        if (activeSync.refCount <= 0) {
          activeSync.cleanupTimer = setTimeout(() => {
            if (activeSync && activeSync.refCount <= 0) {
              activeSync.unsubscribers.forEach((u) => u())
              activeSync = null
            }
          }, 5000)
        }
      }
    }
  }, [user?.uid, user?.role, queryClient])
}
