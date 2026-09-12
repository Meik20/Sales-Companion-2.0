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
      await updateDoc(docRef, {
        ...input.data,
        updatedAt: serverTimestamp()
      })
      return { id: input.id, ...input.data }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
    }
  })
}

