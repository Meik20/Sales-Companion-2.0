'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type AdminStats = {
  totalUsers?: number
  totalCompanies?: number
  totalPipelineItems?: number
  totalSearchesToday?: number
  activeUsers?: number
  newUsersThisWeek?: number
}

export function useAdminStats() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les statistiques')
      }

      return response.json() as Promise<AdminStats>
    },
    enabled: !!user?.uid,
  })
}
