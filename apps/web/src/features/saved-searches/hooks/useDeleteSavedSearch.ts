'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export function useDeleteSavedSearch() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (searchId: string) => {
      if (!user?.uid) throw new Error('Non authentifié')
      const token = await user.getIdToken()
      const res = await fetch(`/api/saved-searches/${searchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { message?: string }).message ?? `Erreur ${res.status}`)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['saved-searches'] })
    }
  })
}
