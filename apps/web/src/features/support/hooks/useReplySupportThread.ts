'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type ReplyInput = {
  threadId: string
  message: string
}

export function useReplySupportThread() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ReplyInput) => {
      const backendUrl = ''
      const token = await user?.getIdToken()

      const response = await fetch(`${backendUrl}/api/support/threads/${input.threadId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: input.message })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.message || "Erreur lors de l'envoi du message")
      }

      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['support-threads'] })
    }
  })
}
