'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type SavedSearch = {
  id: string
  userId: string
  label: string
  filters: Record<string, unknown>
  resultCount?: number
  createdAt: string
  updatedAt?: string
}

export function useSavedSearches() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['saved-searches', user?.uid],
    queryFn: async () => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/saved-searches`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les recherches sauvegardées')
      }

      return response.json() as Promise<SavedSearch[]>
    },
    enabled: !!user?.uid,
  })
}
