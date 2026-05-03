'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { PipelineDoc } from '@sales-companion/shared'

export const useUserPipeline = () => {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['pipeline', user?.uid],
    queryFn: async () => {
      const token = await user?.getIdToken()

      const response = await fetch('/api/pipeline', {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Impossible de charger le pipeline')
      }

      return response.json() as Promise<(PipelineDoc & { id: string })[]>
    },
    enabled: !!user?.uid,
  })
}