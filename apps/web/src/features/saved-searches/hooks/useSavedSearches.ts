'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { savedSearchesRepository } from '@/repositories/saved-searches.repository'

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
      return savedSearchesRepository.findByUserId(user.uid) as Promise<SavedSearch[]>
    },
    enabled: !!user?.uid,
  })
}
