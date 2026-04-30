'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type PipelineItem = {
  id: string
  userId: string
  managerUid?: string
  companyId: string
  companyName: string
  companySector?: string
  companyCity?: string
  companyPhone?: string
  companyEmail?: string
  status: 'prospection' | 'negotiation' | 'conclusion' | 'lost'
  notes?: string
  nextFollowUp?: string
  createdAt: string
  updatedAt: string
}

export function usePipelineItems() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['pipeline', user?.uid],
    queryFn: async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/pipeline`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Impossible de charger le pipeline')
      }

      return response.json() as Promise<PipelineItem[]>
    },
    enabled: !!user?.uid,
  })
}
