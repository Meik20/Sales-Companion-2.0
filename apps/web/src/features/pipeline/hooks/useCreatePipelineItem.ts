'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

type PipelineItemInput = {
  userId: string
  managerUid: string | null
  assignedTo?: string | null
  memberName?: string | null
  memberAccessId?: string | null
  companyId: string | null
  companyName: string
  companySector?: string
  companyCity?: string
  companyPhone?: string
  companyEmail?: string
  status: string
  amount?: number
  currency?: string
  note?: string
  nextAction?: string
  nextDate: string | null
  enteredAt?: string | null
  assignedAt?: string | null
  createdAt: null
  updatedAt: null
}

export function useCreatePipelineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PipelineItemInput) => {
      const nowIso = new Date().toISOString()
      return addDoc(collection(firestore, 'pipeline'), {
        ...input,
        enteredAt: input.enteredAt || nowIso,
        assignedAt: input.assignedAt || (input.assignedTo ? nowIso : null),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
    }
  })
}
