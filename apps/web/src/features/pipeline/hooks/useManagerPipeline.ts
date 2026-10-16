'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { PipelineDoc } from '@sales-companion/shared'
import { usePipelineRealtimeSync } from './usePipelineRealtimeSync'

/**
 * Hook — Pipeline consolidé de l'équipe pour le Team Manager.
 *
 * Consomme l'API serveur /api/pipeline/manager (Admin SDK) garantissant :
 * 1. La source de vérité absolue et l'absence de blocage par les règles Firestore client en mode FREE.
 * 2. Un rafraîchissement temps réel automatique via polling (15s) et refocus fenêtre.
 * 3. La synchronisation instantanée dès qu'un commercial conclut ou fait évoluer un prospect.
 */
export const useManagerPipeline = () => {
  const { user, loading } = useCurrentUser()
  usePipelineRealtimeSync()

  return useQuery({
    queryKey: ['manager-pipeline', user?.uid],
    queryFn: async (): Promise<(PipelineDoc & { id: string })[]> => {
      if (!user?.uid) return []

      const token = await user.getIdToken()
      const res = await fetch('/api/pipeline/manager', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { message?: string }).message || 'Erreur lors du chargement du pipeline manager'
        )
      }

      const items = (await res.json()) as (PipelineDoc & { id: string })[]
      return items
    },
    enabled: !loading && !!user?.uid && user.role === 'manager',
    staleTime: 0,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true
  })
}
