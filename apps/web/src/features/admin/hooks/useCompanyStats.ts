'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type CompanyStats = {
  bySector: Array<{ sector: string; count: number }>
  byRegion: Array<{ region: string; count: number }>
  total: number
}

export function useCompanyStats() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['admin-company-stats'],
    queryFn: async () => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/admin/company-stats`, {
        headers: {
          Authorization: `Bearer ${token || ''}`
        }
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les statistiques')
      }

      return response.json() as Promise<CompanyStats>
    },
    enabled: !!user?.uid
  })
}
