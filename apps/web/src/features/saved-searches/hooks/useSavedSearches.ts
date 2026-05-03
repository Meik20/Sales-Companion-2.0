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
      if (!user?.uid) return []
      const token = await user.getIdToken()

      const res = await fetch('/api/saved-searches', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error('Impossible de charger les recherches')
      }

      return res.json() as Promise<SavedSearch[]>
    },
    enabled: !!user?.uid,
  })
}
