'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type TeamAssignment = {
  id: string
  pipelineItemId: string
  managerId: string
  memberId: string
  createdAt: string
  updatedAt: string
}

export function useTeamAssignments() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['team-assignments', user?.uid],
    queryFn: async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/team/assignments`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les assignations')
      }

      return response.json() as Promise<TeamAssignment[]>
    },
    enabled: !!user?.uid,
  })
}
