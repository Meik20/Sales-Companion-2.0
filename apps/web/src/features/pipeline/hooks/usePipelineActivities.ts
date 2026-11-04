'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PipelineActivityItem, PipelineActivityType } from '@sales-companion/shared'
import { enqueueOfflineMutation } from '@/lib/offline-sync'

export interface ActivityLocation {
  latitude: number
  longitude: number
  accuracy?: number | null
  address?: string | null
}

export interface CreateActivityInput {
  type: PipelineActivityType
  summary: string
  title?: string
  outcome?: string | null
  nextFollowUpDate?: string | null
  location?: ActivityLocation | null
}

export function usePipelineActivities(pipelineItemId?: string | null) {
  return useQuery<PipelineActivityItem[]>({
    queryKey: ['pipeline-activities', pipelineItemId],
    queryFn: async () => {
      if (!pipelineItemId) return []
      const { auth } = await import('@/services/firebase/client')
      const token = await auth.currentUser?.getIdToken()
      if (!token) return []

      const res = await fetch(`/api/pipeline/${pipelineItemId}/activities`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!res.ok) {
        throw new Error('Erreur lors du chargement des activités')
      }
      const data = await res.json()
      return data.activities || []
    },
    enabled: Boolean(pipelineItemId)
  })
}

export function useAddPipelineActivity(pipelineItemId?: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      if (!pipelineItemId) throw new Error('ID opportunité requis')
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

      if (isOffline) {
        // Enregistrement hors ligne immédiat
        enqueueOfflineMutation({
          type: 'add_activity',
          endpoint: `/api/pipeline/${pipelineItemId}/activities`,
          method: 'POST',
          payload: input as unknown as Record<string, unknown>,
          description: `Interaction (${input.type}): ${input.summary.slice(0, 40)}`
        })

        const optimisticItem: PipelineActivityItem = {
          id: `temp_${Date.now()}`,
          pipelineItemId,
          type: input.type,
          summary: input.summary,
          outcome: input.outcome || null,
          title: input.title,
          performedBy: 'me',
          performedByName: 'Moi (hors-ligne)',
          nextFollowUpDate: input.nextFollowUpDate || null,
          createdAt: new Date().toISOString()
        }
        return optimisticItem
      }

      const { auth } = await import('@/services/firebase/client')
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Non authentifié')

      try {
        const res = await fetch(`/api/pipeline/${pipelineItemId}/activities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(input)
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || "Erreur lors de l'enregistrement de l'activité")
        }

        return (await res.json()) as PipelineActivityItem
      } catch (err) {
        // En cas de rupture réseau pendant le fetch, bascule en file d'attente
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          enqueueOfflineMutation({
            type: 'add_activity',
            endpoint: `/api/pipeline/${pipelineItemId}/activities`,
            method: 'POST',
            payload: input as unknown as Record<string, unknown>,
            description: `Interaction (${input.type}): ${input.summary.slice(0, 40)}`
          })
          const fallbackItem: PipelineActivityItem = {
            id: `temp_${Date.now()}`,
            pipelineItemId,
            type: input.type,
            summary: input.summary,
            outcome: input.outcome || null,
            title: input.title,
            performedBy: 'me',
            performedByName: 'Moi (file d’attente)',
            nextFollowUpDate: input.nextFollowUpDate || null,
            createdAt: new Date().toISOString()
          }
          return fallbackItem
        }
        throw err
      }
    },
    onSuccess: (newItem) => {
      if (pipelineItemId) {
        queryClient.setQueryData<PipelineActivityItem[]>(
          ['pipeline-activities', pipelineItemId],
          (old = []) => [newItem, ...old]
        )
        queryClient.invalidateQueries({ queryKey: ['pipeline-activities', pipelineItemId] })
      }
      queryClient.invalidateQueries({ queryKey: ['pipeline-items'] })
      queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['org-pipeline'] })
    }
  })
}
