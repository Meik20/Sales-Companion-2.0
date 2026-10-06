'use client'

import { useQuery } from '@tanstack/react-query'
import { collection, query, where } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getDocsWithOfflineFallback } from '@/lib/firestore-offline'
import { usePipelineRealtimeSync } from './usePipelineRealtimeSync'

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
  usePipelineRealtimeSync()

  const isSeniorManager = user?.role === 'manager' && user?.orgRole === 'senior_manager'

  return useQuery({
    queryKey: ['pipeline-stats', user?.uid, isSeniorManager],
    queryFn: async (): Promise<PipelineStats> => {
      if (!user?.uid) {
        return { total: 0, prospection: 0, negotiation: 0, conclusion: 0, lost: 0, conversionRate: 0 }
      }

      // ── Senior Manager : statistiques consolidées de l'organisation ──────────
      if (isSeniorManager) {
        const token = await user.getIdToken()
        const res = await fetch('/api/pipeline/org', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) {
          return { total: 0, prospection: 0, negotiation: 0, conclusion: 0, lost: 0, conversionRate: 0 }
        }
        const data = await res.json() as {
          counts?: { prospection: number; negociation: number; conclue: number; total: number }
        }
        const c = data.counts ?? { prospection: 0, negociation: 0, conclue: 0, total: 0 }
        return {
          total: c.total,
          prospection: c.prospection,
          negotiation: c.negociation,
          conclusion: c.conclue,
          lost: 0,
          conversionRate: c.total > 0 ? Math.round((c.conclue / c.total) * 100) : 0
        }
      }

      // ── Autres rôles : requêtes Firestore directes ──────────────────────────
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
        if (['prospection', 'prospect', 'to_contact', 'contact', 'nouveau', 'lead'].includes(status)) stats.prospection++
        else if (['negociation', 'negotiation', 'in_progress', 'en_cours'].includes(status)) stats.negotiation++
        else if (['conclue', 'conclusion', 'won', 'closed', 'gagne', 'signe'].includes(status)) stats.conclusion++
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

