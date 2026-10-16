'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

import type { UserDoc } from '@sales-companion/shared'

type AdminUsersResponse = {
  items: UserDoc[]
  total: number
  page: number
  pageSize: number
}

export function useAdminUsers(page = 1, pageSize = 100) {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['admin-users', page, pageSize],
    queryFn: async () => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      })

      const response = await fetch(`${backendUrl}/api/admin/users?${params}`, {
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
    staleTime: 5 * 60 * 1000, // 5 min de cache — réutilise les données entre navigations
    refetchInterval: 5 * 60 * 1000, // Toutes les 5 min — réduit le polling de 5×
    refetchOnWindowFocus: false
  })
}
