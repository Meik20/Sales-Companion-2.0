'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

type UpdateInput = {
  id: string
  data: Record<string, unknown>
}

export function useUpdatePipelineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateInput) => {
      const docRef = doc(firestore, 'pipeline', input.id)
      const isConclue = input.data.status === 'conclue' || input.data.status === 'conclusion'
      const updatePayload: Record<string, unknown> = {
        ...input.data,
        updatedAt: serverTimestamp()
      }
      if (isConclue && !input.data.concludedAt) {
        updatePayload.concludedAt = serverTimestamp()
      }

      await updateDoc(docRef, updatePayload)

      if (isConclue) {
        try {
          const authMod = await import('@/services/firebase/client')
          const currentFirebaseUser = authMod.auth.currentUser
          if (currentFirebaseUser) {
            const token = await currentFirebaseUser.getIdToken()
            void fetch('/api/clients/sync-concluded', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ pipelineId: input.id })
            })
          }
        } catch (e) {
          console.warn('[useUpdatePipelineItem] sync error:', e)
        }
      }

      return { id: input.id, ...input.data }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
      await queryClient.invalidateQueries({ queryKey: ['reporting'] })
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
    }
  })
}
