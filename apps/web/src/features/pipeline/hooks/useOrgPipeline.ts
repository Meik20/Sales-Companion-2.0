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
  segment?: string | null
  zone?: string | null
  displaySegment?: string | null
  stats: {
    prospection: number
    negociation: number
    conclue: number
    total: number
    salespeopleCount?: number
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
  availableSegments?: string[]
  totalSalespeopleCount?: number
  totalSupervisorsCount?: number
  currency?: string
}

interface UseOrgPipelineOptions {
  managerUid?: string
  status?: 'prospection' | 'negociation' | 'conclue'
  /** Période mensuelle YYYY-MM à charger (M en cours si absent) */
  period?: string
  /** Segment spécifique à charger pour l'Exécutif */
  segment?: string
}

/**
 * Hook — Pipeline consolidé de l'organisation (Senior Manager + Executive).
 *
 * Consomme GET /api/pipeline/org avec filtres optionnels.
 * Activé pour senior_manager ET executive (Direction / Observateur stratégique).
 *
 * Synchronisation en temps réel (deux couches) :
 * 1. Polling automatique toutes les 15 secondes (filet de sécurité universel).
 * 2. Listener onSnapshot sur organisations/{orgCode}.lastPipelineUpdate :
 *    lorsque le serveur écrit ce champ après une mutation pipeline, le SM ou
 *    l'Executive reçoit l'événement instantanément et invalide le cache org-pipeline.
 */
export function useOrgPipeline(options: UseOrgPipelineOptions = {}) {
  const { user } = useCurrentUser()
  const isSeniorManager = user?.role === 'manager' && user?.orgRole === 'senior_manager'
  const isExecutive = user?.role === 'manager' && user?.orgRole === 'executive'
  const hasOrgAccess = isSeniorManager || isExecutive

  const params = new URLSearchParams()
  if (options.managerUid) params.set('managerUid', options.managerUid)
  if (options.status) params.set('status', options.status)
  // Transmettre la période sélectionnée pour le filtrage historique côté serveur
  if (options.period) params.set('period', options.period)
  if (options.segment) params.set('segment', options.segment)
  const qs = params.toString()

  return useQuery<OrgPipelineResult>({
    // La période et le segment font partie de la queryKey : un changement provoque un refetch réel
    queryKey: ['org-pipeline', user?.uid, options.managerUid, options.status, options.period ?? 'current', options.segment ?? 'all'],
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
    enabled: !!user?.uid && hasOrgAccess,
    staleTime: 60 * 1000,
    // Polling toutes les 5 minutes au lieu de 15 secondes — useOrgPipelineRealtimeSync invalide déjà le cache instantanément lors d'une mutation.
    refetchInterval: 5 * 60 * 1000,
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
