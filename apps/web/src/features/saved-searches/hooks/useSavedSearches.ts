'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { savedSearchesRepository, SavedSearch as RepoSavedSearch } from '@/repositories/saved-searches.repository'

export type SavedSearch = RepoSavedSearch & {
  id: string
  updatedAt?: string
}

export function useSavedSearches() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['saved-searches', user?.uid],
    queryFn: async (): Promise<SavedSearch[]> => {
      if (!user?.uid) return []
      return savedSearchesRepository.findByUserId(user.uid) as Promise<SavedSearch[]>
    },
    enabled: !!user?.uid,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

