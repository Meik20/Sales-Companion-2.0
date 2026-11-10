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
      // 1. Tenter la mise à jour via la route serveur API (Firebase Admin + sync clients)
      try {
        const authMod = await import('@/services/firebase/client')
        const currentFirebaseUser = authMod.auth.currentUser
        if (currentFirebaseUser) {
          const token = await currentFirebaseUser.getIdToken()
          const res = await fetch(`/api/pipeline/${input.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(input.data)
          })

          if (res.ok) {
            const json = await res.json()
            return { id: input.id, ...input.data, ...json }
          }
          console.warn('[useUpdatePipelineItem] Server PUT failed, fallback to client firestore:', res.status)
        }
      } catch (apiErr) {
        console.warn('[useUpdatePipelineItem] Server PUT error, fallback to client firestore:', apiErr)
      }

      // 2. Fallback direct client Firestore (mode dégradé / offline)
      const docRef = doc(firestore, 'pipeline', input.id)
      const isConclue = input.data.status === 'conclue' || input.data.status === 'conclusion'
      const isPerdue = input.data.status === 'perdue' || input.data.status === 'lost'
      const updatePayload: Record<string, unknown> = {
        ...input.data,
        updatedAt: serverTimestamp()
      }
      if (isConclue && !input.data.concludedAt) {
        updatePayload.concludedAt = serverTimestamp()
      }
      if (isPerdue && !input.data.lostAt) {
        updatePayload.lostAt = serverTimestamp()
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
      // Sync pipeline consolidé du Senior Manager (vue org)
      await queryClient.invalidateQueries({ queryKey: ['org-pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['org-report'] })
    }

  })
}
