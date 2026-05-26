'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export function useDeleteSavedCompany() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.uid) throw new Error('Not authenticated')
      const token = await user.getIdToken()

      const res = await fetch(`/api/saved-companies/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || 'Failed to delete saved company')
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-companies', user?.uid] })
    }
  })
}
