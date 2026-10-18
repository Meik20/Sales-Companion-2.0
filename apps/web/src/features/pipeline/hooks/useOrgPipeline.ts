'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import * as firestoreModule from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

export interface OrgPipelineItem {
  id: string
  companyName?: string
  name?: string
  status: 'prospection' | 'negociation' | 'conclue' | string
  managerUid?: string
  managerName?: string
  managerOrgRole?: string
  userId?: string
  assignedTo?: string
  memberName?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface OrgManagerStats {
  uid: string
  name: string
  email: string
  orgRole: string
  isSenior: boolean
  isCurrent: boolean
  stats: {
    prospection: number
    negociation: number
    conclue: number
    total: number
  }
}

export interface OrgPipelineResult {
  items: OrgPipelineItem[]
  managers: OrgManagerStats[]
  counts: {
    prospection: number
    negociation: number
    conclue: number
    total: number
  }
  orgCode: string
}

interface UseOrgPipelineOptions {
  managerUid?: string
  status?: 'prospection' | 'negociation' | 'conclue'
}

/**
 * Hook — Pipeline consolidé de l'organisation (Senior Manager uniquement).
 *
 * Consomme GET /api/pipeline/org avec filtres optionnels.
 * Désactivé si l'utilisateur n'est pas senior_manager.
 *
 * Synchronisation en temps réel (deux couches) :
 * 1. Polling automatique toutes les 15 secondes (filet de sécurité universel).
 * 2. Listener onSnapshot sur organisations/{orgCode}.lastPipelineUpdate :
 *    lorsque le serveur écrit ce champ après une mutation pipeline, le SM
 *    reçoit l'événement instantanément et invalide le cache org-pipeline.
 *    Le SM a read access sur organisations/{orgCode} (Firestore rules L505-506).
 */
export function useOrgPipeline(options: UseOrgPipelineOptions = {}) {
  const { user } = useCurrentUser()
  const isSeniorManager = user?.role === 'manager' && user?.orgRole === 'senior_manager'

  const params = new URLSearchParams()
  if (options.managerUid) params.set('managerUid', options.managerUid)
  if (options.status) params.set('status', options.status)
  const qs = params.toString()

  return useQuery<OrgPipelineResult>({
    queryKey: ['org-pipeline', user?.uid, options.managerUid, options.status],
    queryFn: async (): Promise<OrgPipelineResult> => {
      if (!user) throw new Error('Non authentifié')
      const token = await user.getIdToken()
      const res = await fetch(`/api/pipeline/org${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Erreur serveur')
      }
      return res.json() as Promise<OrgPipelineResult>
    },
    enabled: !!user?.uid && isSeniorManager,
    // staleTime à 0 : le cache est immédiatement considéré périmé après chaque
    // fetch, ce qui garantit que les invalidations déclenchent un refetch réel.
    staleTime: 0,
    // Polling toutes les 15 secondes — filet de sécurité pour la sync cross-browser.
    refetchInterval: 15 * 1000,
    // Refetch immédiat au retour sur l'onglet.
    refetchOnWindowFocus: true
  })
}

/**
 * Hook — Sync temps réel du pipeline SM via onSnapshot sur organisations/{orgCode}.
 *
 * Le serveur met à jour organisations/{orgCode}.lastPipelineUpdate (Admin SDK) après
 * chaque mutation pipeline (PUT /api/pipeline/[id], POST /api/pipeline/add).
 * Ce hook détecte ce changement et invalide immédiatement ['org-pipeline'] dans le
 * cache React Query, forçant un refetch sans attendre le prochain cycle de polling.
 *
 * Doit être appelé une seule fois dans le layout SM ou dans useOrgPipeline.
 * Utilise un ref-guard pour éviter les multiples souscriptions.
 */
export function useOrgPipelineRealtimeSync() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const orgCode = user?.orgCode

    if (!orgCode || !firestore) {
      return
    }

    // Déjà abonné → ne pas créer un double listener
    if (unsubRef.current) return

    const doc = (firestoreModule as any).doc
    const onSnapshot = (firestoreModule as any).onSnapshot

    if (typeof doc !== 'function' || typeof onSnapshot !== 'function') return

    try {
      const orgDocRef = doc(firestore, 'organisations', orgCode)
      let lastKnownUpdate: string | null = null

      const unsub = onSnapshot(
        orgDocRef,
        (snapshot: any) => {
          if (!snapshot.exists()) return
          const data = snapshot.data()
          const current = `${data?.lastPipelineUpdate ?? ''}_${data?.lastImportsUpdate ?? ''}`

          // Premier snapshot — mémoriser sans invalider (état initial)
          if (lastKnownUpdate === null) {
            lastKnownUpdate = current
            return
          }

          // Changement détecté → refetch immédiat pour l'ensemble des rôles de l'organisation
          if (current !== lastKnownUpdate) {
            lastKnownUpdate = current
            void queryClient.invalidateQueries({ queryKey: ['org-pipeline'] })
            void queryClient.invalidateQueries({ queryKey: ['org-report'] })
            void queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] })
            void queryClient.invalidateQueries({ queryKey: ['pipeline'] })
            void queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
            void queryClient.invalidateQueries({ queryKey: ['reporting'] })
            void queryClient.invalidateQueries({ queryKey: ['clients'] })
            void queryClient.invalidateQueries({ queryKey: ['imports'] })
          }
        },
        (error: any) => {
          console.warn('[useOrgPipelineRealtimeSync] onSnapshot error:', error)
        }
      )

      unsubRef.current = unsub
    } catch (e) {
      console.warn('[useOrgPipelineRealtimeSync] Failed to attach org listener:', e)
    }

    return () => {
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [user?.uid, user?.orgCode, user?.orgRole, user?.role, queryClient])
}
