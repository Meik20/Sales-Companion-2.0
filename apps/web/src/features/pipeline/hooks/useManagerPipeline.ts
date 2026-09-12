'use client'

import { useQuery } from '@tanstack/react-query'
import { collection, query, where } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getDocsWithOfflineFallback, formatTimestamp } from '@/lib/firestore-offline'
import type { PipelineDoc } from '@sales-companion/shared'

export const useManagerPipeline = () => {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['manager-pipeline', user?.uid],
    queryFn: async (): Promise<(PipelineDoc & { id: string })[]> => {
      if (!user?.uid) return []

      const q = query(collection(firestore, 'pipeline'), where('managerUid', '==', user.uid))
      const snap = await getDocsWithOfflineFallback(q)

      const items = snap.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          companyName: (data.companyName || data.name || '') as string,
          companyId: (data.companyId || docSnap.id) as string,
          status: data.status || 'prospection',
          userId: (data.userId || user.uid) as string,
          createdAt: formatTimestamp(data.createdAt) || new Date().toISOString(),
          updatedAt: formatTimestamp(data.updatedAt) || new Date().toISOString()
        } as unknown as (PipelineDoc & { id: string })
      })

      items.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0
        return tb - ta
      })

      return items
    },
    enabled: !!user?.uid && user.role === 'manager',
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

