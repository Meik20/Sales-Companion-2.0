'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { savedSearchesRepository } from '@/repositories/saved-searches.repository'

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (searchId: string) => {
      await savedSearchesRepository.delete(searchId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['saved-searches'] })
    },
  })
}
