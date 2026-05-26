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
  roleDistribution?: Record<string, number>
  planDistribution?: Record<string, number>
}

export function useAdminStats() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token || ''}`
        }
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les statistiques')
      }

      return response.json() as Promise<AdminStats>
    },
    enabled: !!user?.uid,
    refetchInterval: 5000, // Refresh automatically every 5 seconds
    refetchOnWindowFocus: true
  })
}
