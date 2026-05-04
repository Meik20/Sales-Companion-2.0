'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type TeamAssignment = {
  id: string
  assigneeId: string
  assigneeUid: string
  prospectIds: string[]
  managerUid: string
  managerName: string
  note: string
  status: string
  createdAt: string
  updatedAt: string
}

export function useTeamAssignments() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['team-assignments', user?.uid],
    queryFn: async () => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/team/assignments`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les assignations')
      }

      const data = await response.json()
      // Backend retourne { items: [...] }
      return (data.items || []) as Promise<TeamAssignment[]>
    },
    enabled: !!user?.uid,
  })
}
