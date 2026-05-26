'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type UpdateInput = {
  id: string
  data: Record<string, unknown>
}

export function useUpdatePipelineItem() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateInput) => {
      const token = await user?.getIdToken()

      const response = await fetch(`/api/pipeline/${input.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input.data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.message || 'Erreur lors de la mise à jour')
      }

      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
    }
  })
}
