'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, deleteDoc } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

export function useDeletePipelineItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      let apiSuccess = false

      // 1. Appel sécurisé vers l'API backend avec token d'authentification
      try {
        const authMod = await import('@/services/firebase/client')
        const currentFirebaseUser = authMod.auth?.currentUser
        if (currentFirebaseUser && typeof fetch !== 'undefined') {
          const token = await currentFirebaseUser.getIdToken()
          const res = await fetch(`/api/pipeline/${encodeURIComponent(itemId)}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
          if (res.ok) {
            apiSuccess = true
          } else if (res.status === 401 || res.status === 403 || res.status === 404) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData.message || 'Permissions insuffisantes')
          }
        }
      } catch (err: any) {
        if (
          err?.message === 'Permissions insuffisantes' ||
          err?.message === 'Accès refusé' ||
          err?.message === 'Non authentifié'
        ) {
          throw err
        }
      }

      // 2. Repli direct client SDK Firestore
      if (!apiSuccess) {
        const docRef = doc(firestore, 'pipeline', itemId)
        await deleteDoc(docRef)
      }

      return { success: true, id: itemId }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['manager-pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
      // Sync pipeline consolidé du Senior Manager (vue org)
      await queryClient.invalidateQueries({ queryKey: ['org-pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['org-report'] })
    }
  })
}
