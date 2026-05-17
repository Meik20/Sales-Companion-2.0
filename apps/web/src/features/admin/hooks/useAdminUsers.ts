'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

import type { UserDoc } from '@sales-companion/shared'

type AdminUsersResponse = {
  items: UserDoc[]
  total: number
}

export function useAdminUsers() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token || ''}`
        }
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les utilisateurs')
      }

      return response.json() as Promise<AdminUsersResponse>
    },
    enabled: !!user?.uid,
    refetchInterval: 5000, // Real-time updates every 5 seconds
    refetchOnWindowFocus: true
  })
}
