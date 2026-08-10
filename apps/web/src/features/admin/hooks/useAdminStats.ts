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
    staleTime: 5 * 60 * 1000,     // 5 min de cache — réutilise les données entre navigations
    refetchInterval: 5 * 60 * 1000, // Toutes les 5 min — réduit le polling de 5×
    refetchOnWindowFocus: false
  })
}
