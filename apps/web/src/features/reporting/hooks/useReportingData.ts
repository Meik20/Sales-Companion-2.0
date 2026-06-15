'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type MemberStat = {
  uid: string
  name: string
  prospection: number
  negociation: number
  conclue: number
  total: number
  conversionRate: number // % items "conclue"
}

export type ReportingData = {
  totalItems: number
  totalProspection: number
  totalNegociation: number
  totalConclue: number
  overallConversionRate: number
  topPerformer: string | null
  memberStats: MemberStat[]
  // Monthly totals (last 6 months)
  monthlyTrend: { month: string; conclue: number; total: number }[]
}

export function useReportingData() {
  const { user } = useCurrentUser()

  return useQuery<ReportingData>({
    queryKey: ['reporting', user?.uid],
    queryFn: async () => {
      const token = await user?.getIdToken()
      const res = await fetch('/api/reporting', {
        headers: { Authorization: `Bearer ${token || ''}` }
      })
      if (!res.ok) throw new Error('Impossible de charger les données de reporting')
      return res.json()
    },
    enabled: !!user?.uid && user?.role === 'manager',
    staleTime: 5 * 60 * 1000 // 5 min cache
  })
}
