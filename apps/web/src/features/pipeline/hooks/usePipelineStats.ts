'use client'

import { useQuery } from '@tanstack/react-query'
import { collection, query, where } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getDocsWithOfflineFallback } from '@/lib/firestore-offline'
import { calculatePipelineStats } from '@/lib/pipeline-metrics'
import { usePipelineRealtimeSync } from './usePipelineRealtimeSync'

export type PipelineStats = {
  total: number
  prospection: number
  negotiation: number
  conclusion: number
  lost: number
  conversionRate?: number
  prospectionAmount?: number
  negotiationAmount?: number
  conclusionAmount?: number
}

export function usePipelineStats() {
  const { user } = useCurrentUser()
  usePipelineRealtimeSync()

  const isSeniorManager = user?.role === 'manager' && user?.orgRole === 'senior_manager'

  return useQuery({
    queryKey: ['pipeline-stats', user?.uid, isSeniorManager],
    queryFn: async (): Promise<PipelineStats> => {
      if (!user?.uid) {
        return {
          total: 0,
          prospection: 0,
          negotiation: 0,
          conclusion: 0,
          lost: 0,
          conversionRate: 0,
          prospectionAmount: 0,
          negotiationAmount: 0,
          conclusionAmount: 0
        }
      }

      // ── Senior Manager : statistiques consolidées de l'organisation ──────────
      if (isSeniorManager) {
        const token = await user.getIdToken()
        const res = await fetch('/api/pipeline/org', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) {
          return {
            total: 0,
            prospection: 0,
            negotiation: 0,
            conclusion: 0,
            lost: 0,
            conversionRate: 0,
            prospectionAmount: 0,
            negotiationAmount: 0,
            conclusionAmount: 0
          }
        }
        const data = (await res.json()) as {
          counts?: { prospection: number; negociation: number; conclue: number; total: number }
          values?: { prospection: number; negociation: number; conclue: number; total: number }
        }
        const c = data.counts ?? { prospection: 0, negociation: 0, conclue: 0, total: 0 }
        const v = data.values ?? { prospection: 0, negociation: 0, conclue: 0, total: 0 }
        return {
          total: c.total,
          prospection: c.prospection,
          negotiation: c.negociation,
          conclusion: c.conclue,
          lost: 0,
          conversionRate: c.total > 0 ? Math.round((c.conclue / c.total) * 100) : 0,
          prospectionAmount: v.prospection,
          negotiationAmount: v.negociation,
          conclusionAmount: v.conclue
        }
      }

      // ── Team Manager : statistiques directes via /api/pipeline/stats ────────
      if (user.role === 'manager' && !isSeniorManager) {
        try {
          const token = await user.getIdToken()
          const res = await fetch('/api/pipeline/stats', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const data = (await res.json()) as PipelineStats
            return data
          }
        } catch {
          // Fallback sur requête Firestore locale si offline
        }
      }

      // ── Autres rôles / Fallback : requêtes Firestore directes ────────────────
      const isManager = user.role === 'manager'
      const seen = new Set<string>()
      const docs: { status: string; amount: number }[] = []

      if (isManager) {
        const q = query(collection(firestore, 'pipeline'), where('managerUid', '==', user.uid))
        const snap = await getDocsWithOfflineFallback(q)
        snap.docs.forEach((d) => {
          const data = d.data()
          if (data.archived === true) return
          seen.add(d.id)
          docs.push({
            status: (data.status || '') as string,
            amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0
          })
        })
      } else {
        const ownedQ = query(collection(firestore, 'pipeline'), where('userId', '==', user.uid))
        const ownedSnap = await getDocsWithOfflineFallback(ownedQ)
        ownedSnap.docs.forEach((d) => {
          const data = d.data()
          if (data.archived === true) return
          seen.add(d.id)
          docs.push({
            status: (data.status || '') as string,
            amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0
          })
        })

        try {
          const assignedQ = query(
            collection(firestore, 'pipeline'),
            where('assignedTo', '==', user.uid)
          )
          const assignedSnap = await getDocsWithOfflineFallback(assignedQ)
          assignedSnap.docs.forEach((d) => {
            if (!seen.has(d.id)) {
              const data = d.data()
              if (data.archived === true) return
              seen.add(d.id)
              docs.push({
                status: (data.status || '') as string,
                amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0
              })
            }
          })
        } catch {
          // Ignore if assignedTo query fails
        }
      }

      const metrics = calculatePipelineStats(docs)
      let lostCount = 0
      docs.forEach((doc) => {
        const st = (doc.status || '').toLowerCase().trim()
        if (st === 'lost' || st === 'perdu') lostCount++
      })

      return {
        total: metrics.totalCount,
        prospection: metrics.prospectionCount,
        negotiation: metrics.negociationCount,
        conclusion: metrics.conclueCount,
        lost: lostCount,
        conversionRate: metrics.conversionRate,
        prospectionAmount: metrics.prospectionAmount,
        negotiationAmount: metrics.negociationAmount,
        conclusionAmount: metrics.concludedAmount
      }
    },
    enabled: !!user?.uid,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: false
  })
}
