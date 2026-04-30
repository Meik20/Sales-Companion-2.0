'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type TeamMember = {
  uid: string
  email: string
  name: string
  role: 'member'
  managerUid: string
  active: boolean
  dailyUsed: number
  dailyLimit: number
}

export function useTeamMembers() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['team-members', user?.uid],
    queryFn: async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/team/members`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les membres de l\'équipe')
      }

      return response.json() as Promise<TeamMember[]>
    },
    enabled: !!user?.uid,
  })
}
