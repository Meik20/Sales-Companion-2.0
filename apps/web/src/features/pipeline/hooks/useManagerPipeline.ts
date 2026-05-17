'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { PipelineDoc } from '@sales-companion/shared'

export const useManagerPipeline = () => {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['manager-pipeline', user?.uid],
    queryFn: async () => {
      const token = await user?.getIdToken()

      const response = await fetch('/api/pipeline/manager', {
        headers: {
          Authorization: `Bearer ${token || ''}`
        }
      })

      if (!response.ok) {
        throw new Error('Impossible de charger le pipeline équipe')
      }

      return response.json() as Promise<(PipelineDoc & { id: string })[]>
    },
    enabled: !!user?.uid && user.role === 'manager'
  })
}
