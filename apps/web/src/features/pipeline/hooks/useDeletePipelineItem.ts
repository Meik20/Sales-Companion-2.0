'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, deleteDoc } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

export function useDeletePipelineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const docRef = doc(firestore, 'pipeline', itemId)
      await deleteDoc(docRef)
      return { success: true, id: itemId }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
    }
  })
}

