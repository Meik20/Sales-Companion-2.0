'use client'

import { useQuery } from '@tanstack/react-query'
import { collection, query, where } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getDocsWithOfflineFallback, formatTimestamp } from '@/lib/firestore-offline'

export type PipelineItem = {
  id: string
  userId: string
  managerUid?: string
  assignedTo?: string
  companyId: string
  companyName: string
  companySector?: string
  companyCity?: string
  companyPhone?: string
  companyEmail?: string
  status: 'prospection' | 'negotiation' | 'conclusion' | 'lost' | 'negociation' | 'conclue'
  notes?: string
  nextFollowUp?: string
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

export function usePipelineItems() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['pipeline', user?.uid],
    queryFn: async (): Promise<PipelineItem[]> => {
      if (!user?.uid) return []

      const ownedQ = query(collection(firestore, 'pipeline'), where('userId', '==', user.uid))
      const ownedSnap = await getDocsWithOfflineFallback(ownedQ)

      const seen = new Set<string>()
      const items: PipelineItem[] = []

      ownedSnap.docs.forEach((docSnap) => {
        seen.add(docSnap.id)
        const data = docSnap.data()
        items.push({
          id: docSnap.id,
          ...data,
          companyName: (data.companyName || data.name || '') as string,
          companyId: (data.companyId || docSnap.id) as string,
          status: (data.status || 'prospection') as PipelineItem['status'],
          userId: (data.userId || user.uid) as string,
          createdAt: formatTimestamp(data.createdAt) || new Date().toISOString(),
          updatedAt: formatTimestamp(data.updatedAt) || new Date().toISOString()
        } as PipelineItem)
      })

      // Fetch assigned items if any
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
              status: (data.status || 'prospection') as PipelineItem['status'],
              userId: (data.userId || user.uid) as string,
              createdAt: formatTimestamp(data.createdAt) || new Date().toISOString(),
              updatedAt: formatTimestamp(data.updatedAt) || new Date().toISOString()
            } as PipelineItem)
          }
        })
      } catch {
        // Ignore if assignedTo query fails
      }

      items.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })

      return items
    },
    enabled: !!user?.uid,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

