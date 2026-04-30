'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { savedSearchesRepository } from '@/repositories/saved-searches.repository'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type Input = {
  label:       string
  filters:     Record<string, unknown>
  resultCount?: number
}

export function useCreateSavedSearch() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Input) => {
      if (!user?.uid) throw new Error('Non authentifié')
      return savedSearchesRepository.create({
        userId:      user.uid,
        label:       input.label,
        filters:     input.filters,
        resultCount: input.resultCount ?? 0,
        createdAt:   null,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['saved-searches'] })
    },
  })
}
