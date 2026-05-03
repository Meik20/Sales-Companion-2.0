'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { PipelineDoc } from '@sales-companion/shared'

export const useManagerPipeline = () => {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['manager-pipeline', user?.uid],
    queryFn: async () => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/pipeline/manager`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch manager pipeline')
      }

      return response.json() as Promise<(PipelineDoc & { id: string })[]>
    },
    enabled: !!user?.uid && user.role === 'manager',
  })
}