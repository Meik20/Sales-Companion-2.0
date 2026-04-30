'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

type PipelineItemInput = {
  userId: string
  managerUid: string | null
  companyId: string | null
  companyName: string
  companySector?: string
  companyCity?: string
  companyPhone?: string
  companyEmail?: string
  status: string
  note?: string
  nextAction?: string
  nextDate: string | null
  createdAt: null
  updatedAt: null
}

export function useCreatePipelineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PipelineItemInput) => {
      return addDoc(collection(firestore, 'pipeline'), {
        ...input,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
  })
}
