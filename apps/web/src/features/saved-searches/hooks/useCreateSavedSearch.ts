'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { savedSearchesRepository } from '@/repositories/saved-searches.repository'

type Input = {
  label: string
  filters: Record<string, unknown>
  resultCount?: number
}

export function useCreateSavedSearch() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Input) => {
      if (!user?.uid) throw new Error('Non authentifié')

      const token = await user.getIdToken().catch(() => undefined)
      const docRef = await savedSearchesRepository.create(
        {
          userId: user.uid,
          label: input.label,
          filters: input.filters,
          resultCount: input.resultCount ?? 0,
          createdAt: new Date()
        },
        token
      )

      return { id: docRef.id, success: true }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['saved-searches'] })
    }
  })
}

