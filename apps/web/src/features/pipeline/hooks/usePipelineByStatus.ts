'use client'

import { useQuery } from '@tanstack/react-query'
import { usePipelineItems } from './usePipelineItems'

export type PipelineStatus = 'prospection' | 'negotiation' | 'conclusion' | 'lost'

export function usePipelineByStatus(status?: PipelineStatus) {
  const pipelineQuery = usePipelineItems()

  return useQuery({
    queryKey: ['pipeline', 'by-status', status],
    queryFn: async () => {
      const items = pipelineQuery.data || []
      
      if (!status) {
        return items
      }

      return items.filter((item) => item.status === status)
    },
    enabled: !!pipelineQuery.data,
  })
}
