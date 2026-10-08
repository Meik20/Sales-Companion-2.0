'use client'

import { useQuery } from '@tanstack/react-query'
import { collection, query, where } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getDocsWithOfflineFallback, formatTimestamp } from '@/lib/firestore-offline'
import type { PipelineDoc } from '@sales-companion/shared'
import { usePipelineRealtimeSync } from './usePipelineRealtimeSync'

export const useManagerPipeline = () => {
  const { user, loading } = useCurrentUser()
  usePipelineRealtimeSync()

  return useQuery({
    queryKey: ['manager-pipeline', user?.uid],
    queryFn: async (): Promise<(PipelineDoc & { id: string })[]> => {
      if (!user?.uid) return []

      const teamQ = query(collection(firestore, 'pipeline'), where('managerUid', '==', user.uid))
      const teamSnap = await getDocsWithOfflineFallback(teamQ)

      const seen = new Set<string>()
      const assignedCompanies = new Set<string>()
      const items: (PipelineDoc & { id: string })[] = []

      teamSnap.docs.forEach((docSnap) => {
        seen.add(docSnap.id)
        const data = docSnap.data()
        const compName = String(data.companyName || data.name || '')
          .trim()
          .toLowerCase()
        if (compName) {
          assignedCompanies.add(compName)
        }
        items.push({
          id: docSnap.id,
          ...data,
          companyName: (data.companyName || data.name || '') as string,
          companyId: (data.companyId || docSnap.id) as string,
          status: data.status || 'prospection',
          userId: (data.userId || user.uid) as string,
          createdAt: formatTimestamp(data.createdAt) || new Date().toISOString(),
          updatedAt: formatTimestamp(data.updatedAt) || new Date().toISOString()
        } as unknown as PipelineDoc & { id: string })
      })

      try {
        const ownQ = query(collection(firestore, 'pipeline'), where('userId', '==', user.uid))
        const ownSnap = await getDocsWithOfflineFallback(ownQ)
        ownSnap.docs.forEach((docSnap) => {
          if (!seen.has(docSnap.id)) {
            const data = docSnap.data()
            const compName = String(data.companyName || data.name || '')
              .trim()
              .toLowerCase()
            // Ne supprimer de la vue que si l'entreprise a déjà une fiche ASSIGNÉE à un membre
            // (la fiche membre a assignedTo != null dans teamSnap).
            // Un prospect manager en attente d'assignation (assignedTo = null) doit rester visible.
            if (
              compName &&
              assignedCompanies.has(compName) &&
              data.assignedTo &&
              data.assignedTo !== user.uid
            ) {
              return
            }
            seen.add(docSnap.id)
            items.push({
              id: docSnap.id,
              ...data,
              companyName: (data.companyName || data.name || '') as string,
              companyId: (data.companyId || docSnap.id) as string,
              status: data.status || 'prospection',
              userId: (data.userId || user.uid) as string,
              createdAt: formatTimestamp(data.createdAt) || new Date().toISOString(),
              updatedAt: formatTimestamp(data.updatedAt) || new Date().toISOString()
            } as unknown as PipelineDoc & { id: string })
          }
        })
      } catch {
        // Ignore
      }

      items.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0
        return tb - ta
      })

      return items
    },
    enabled: !loading && !!user?.uid && user.role === 'manager',
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}
