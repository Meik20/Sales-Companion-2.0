'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
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

      const token = await user.getIdToken()
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label:       input.label,
          filters:     input.filters,
          resultCount: input.resultCount ?? 0,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((json as { message?: string }).message ?? `Erreur ${res.status}`)
      }
      return json
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['saved-searches'] })
    },
  })
}
