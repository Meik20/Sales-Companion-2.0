'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, deleteDoc } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export function useDeleteSavedCompany() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(firestore, 'saved_companies', id)
      await deleteDoc(docRef)
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-companies', user?.uid] })
    }
  })
}

