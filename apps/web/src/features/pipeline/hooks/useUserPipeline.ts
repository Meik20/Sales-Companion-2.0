'use client'

import { useQuery } from '@tanstack/react-query'
import { collection, query, where } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getDocsWithOfflineFallback, formatTimestamp } from '@/lib/firestore-offline'
import type { PipelineDoc } from '@sales-companion/shared'

export const useUserPipeline = () => {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['pipeline', user?.uid],
    queryFn: async (): Promise<(PipelineDoc & { id: string })[]> => {
      if (!user?.uid) return []

      const ownedQ = query(collection(firestore, 'pipeline'), where('userId', '==', user.uid))
      const ownedSnap = await getDocsWithOfflineFallback(ownedQ)

      const seen = new Set<string>()
      const items: (PipelineDoc & { id: string })[] = []

      ownedSnap.docs.forEach((docSnap) => {
        seen.add(docSnap.id)
        const data = docSnap.data()
        items.push({
          id: docSnap.id,
          ...data,
          companyName: (data.companyName || data.name || '') as string,
          companyId: (data.companyId || docSnap.id) as string,
          status: data.status || 'prospection',
          userId: (data.userId || user.uid) as string,
          createdAt: formatTimestamp(data.createdAt) || new Date().toISOString(),
          updatedAt: formatTimestamp(data.updatedAt) || new Date().toISOString()
        } as unknown as (PipelineDoc & { id: string }))
      })

      // Also get assigned items if any
      try {
        const assignedQ = query(collection(firestore, 'pipeline'), where('assignedTo', '==', user.uid))
        const assignedSnap = await getDocsWithOfflineFallback(assignedQ)
        assignedSnap.docs.forEach((docSnap) => {
          if (!seen.has(docSnap.id)) {
            seen.add(docSnap.id)
            const data = docSnap.data()
            items.push({
              id: docSnap.id,
              ...data,
              companyName: (data.companyName || data.name || '') as string,
              companyId: (data.companyId || docSnap.id) as string,
              status: data.status || 'prospection',
              userId: (data.userId || user.uid) as string,
              createdAt: formatTimestamp(data.createdAt) || new Date().toISOString(),
              updatedAt: formatTimestamp(data.updatedAt) || new Date().toISOString()
            } as unknown as (PipelineDoc & { id: string }))
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
    enabled: !!user?.uid,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

