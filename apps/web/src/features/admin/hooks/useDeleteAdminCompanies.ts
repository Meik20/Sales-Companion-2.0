'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export function useDeleteAdminCompanies() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const results = await Promise.all(ids.map(async (id) => {
        const response = await fetch(`${backendUrl}/api/admin/companies/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData?.message || `Erreur lors de la suppression de l'entreprise (${response.status})`
          )
        }

        return response.json()
      }))

      return results
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-companies'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-company-stats'] })
    },
  })
}
