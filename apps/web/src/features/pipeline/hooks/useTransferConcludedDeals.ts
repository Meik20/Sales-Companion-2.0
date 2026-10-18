'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useTransferConcludedDeals() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { itemIds?: string[]; memberId?: string }) => {
      const authMod = await import('@/services/firebase/client')
      const currentFirebaseUser = authMod.auth?.currentUser
      if (!currentFirebaseUser) {
        throw new Error('Utilisateur non authentifié')
      }

      const token = await currentFirebaseUser.getIdToken()
      const res = await fetch('/api/pipeline/transfer-concluded', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Erreur lors du transfert vers la base clients')
      }

      return res.json()
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['org-pipeline'] }),
        queryClient.invalidateQueries({ queryKey: ['org-report'] }),
        queryClient.invalidateQueries({ queryKey: ['clients'] })
      ])
    }
  })
}
