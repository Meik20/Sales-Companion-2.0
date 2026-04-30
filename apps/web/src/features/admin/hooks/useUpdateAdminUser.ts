'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type UpdateInput = {
  uid: string
  data: Record<string, unknown>
}

export function useUpdateAdminUser() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateInput) => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/admin/users/${input.uid}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input.data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData?.message || `Erreur lors de la mise à jour (${response.status})`
        )
      }

      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}
