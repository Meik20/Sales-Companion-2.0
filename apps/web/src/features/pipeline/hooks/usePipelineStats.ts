'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type PipelineStats = {
  total: number
  prospection: number
  negotiation: number
  conclusion: number
  lost: number
  conversionRate?: number
}

export function usePipelineStats() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['pipeline-stats', user?.uid],
    queryFn: async () => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/pipeline/stats`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les statistiques du pipeline')
      }

      return response.json() as Promise<PipelineStats>
    },
    enabled: !!user?.uid,
  })
}
