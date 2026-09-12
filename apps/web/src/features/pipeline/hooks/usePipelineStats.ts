'use client'

import { useQuery } from '@tanstack/react-query'
import { collection, query, where } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getDocsWithOfflineFallback } from '@/lib/firestore-offline'

export type PipelineStats = {
  total: number
  prospection: number
  negotiation: number
  conclusion: number
  lost: number
  conversionRate?: number
}

export function usePipelineStats() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['pipeline-stats', user?.uid],
    queryFn: async (): Promise<PipelineStats> => {
      if (!user?.uid) {
        return { total: 0, prospection: 0, negotiation: 0, conclusion: 0, lost: 0, conversionRate: 0 }
      }

      const isManager = user.role === 'manager'
      const seen = new Set<string>()
      const docs: { status: string }[] = []

      if (isManager) {
        const q = query(collection(firestore, 'pipeline'), where('managerUid', '==', user.uid))
        const snap = await getDocsWithOfflineFallback(q)
        snap.docs.forEach((d) => {
          seen.add(d.id)
          docs.push({ status: (d.data().status || '') as string })
        })
      } else {
        const ownedQ = query(collection(firestore, 'pipeline'), where('userId', '==', user.uid))
        const ownedSnap = await getDocsWithOfflineFallback(ownedQ)
        ownedSnap.docs.forEach((d) => {
          seen.add(d.id)
          docs.push({ status: (d.data().status || '') as string })
        })

        try {
          const assignedQ = query(collection(firestore, 'pipeline'), where('assignedTo', '==', user.uid))
          const assignedSnap = await getDocsWithOfflineFallback(assignedQ)
          assignedSnap.docs.forEach((d) => {
            if (!seen.has(d.id)) {
              seen.add(d.id)
              docs.push({ status: (d.data().status || '') as string })
            }
          })
        } catch {
          // Ignore if assignedTo query fails
        }
      }

      const stats: PipelineStats = {
        total: docs.length,
        prospection: 0,
        negotiation: 0,
        conclusion: 0,
        lost: 0,
        conversionRate: 0
      }

      docs.forEach((doc) => {
        const status = doc.status.toLowerCase()
        if (status === 'prospection' || status === 'prospect') stats.prospection++
        else if (status === 'negociation' || status === 'negotiation') stats.negotiation++
        else if (status === 'conclue' || status === 'conclusion') stats.conclusion++
        else if (status === 'lost' || status === 'perdu') stats.lost++
      })

      stats.conversionRate = stats.total > 0 ? Math.round((stats.conclusion / stats.total) * 100) : 0

      return stats
    },
    enabled: !!user?.uid,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: false
  })
}

