'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type CreateAssignmentInput = {
  pipelineItemId: string
  memberId: string
}

export function useCreateTeamAssignment() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAssignmentInput) => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/team/assignments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.message || 'Erreur lors de l\'assignation')
      }

      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['team-assignments'] })
    },
  })
}
