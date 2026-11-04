'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export interface OrgReportManager {
  uid: string
  name: string
  email: string
  orgRole: string
  isSenior: boolean
  stats: {
    prospection: number
    negociation: number
    conclue: number
    perdue?: number
    total: number
    concludedAmount?: number
  }
  targetVolume?: number | null
  targetValue?: number | null
  volumeAttainmentRate?: number | null
  valueAttainmentRate?: number | null
}

export interface OrgRecentActivity {
  id: string
  companyName: string
  managerUid: string
  managerName: string
  memberName?: string | null
  updatedAt?: string | null
}

export interface OrgReportTargets {
  targetVolume: number | null
  targetValue: number | null
  volumeRealized: number
  valueRealized: number
  volumeAttainmentRate: number | null
  valueAttainmentRate: number | null
}

export interface OrgReportResult {
  orgCode: string
  managers: OrgReportManager[]
  globalCounts: {
    prospection: number
    negociation: number
    conclue: number
    perdue?: number
    total: number
  }
  conversionRate: number
  totalConcludedAmount?: number
  totalPipelineValue?: number
  totalLostAmount?: number
  lossReasonsSummary?: Record<string, number>
  targets?: OrgReportTargets
  monthlyCycle?: {
    currentPeriod: { key: string; labelFr: string; labelEn: string; isGracePeriod: boolean; isClosed: boolean }
    prevPeriod: { key: string; labelFr: string; labelEn: string; isGracePeriod: boolean; isClosed: boolean }
    isWithinJ3GracePeriod: boolean
    defaultPeriodKey: string
    availablePeriods: Array<{ key: string; labelFr: string; labelEn: string; isGracePeriod: boolean; isClosed: boolean }>
  }
  recentActivity: OrgRecentActivity[]
  totalManagers: number
}

export type OrgReportQueryOptions = string | { period?: string; from?: string; to?: string }

/**
 * Hook — KPIs consolidés de l'organisation (Senior Manager uniquement).
 * Consomme GET /api/reporting/org avec support des filtres journaliers Day-by-Day.
 */
export function useOrgReport(options?: OrgReportQueryOptions) {
  const { user } = useCurrentUser()
  const isSeniorManager = user?.role === 'manager' && user?.orgRole === 'senior_manager'

  const queryKey = typeof options === 'string'
    ? ['org-report', user?.uid, options]
    : ['org-report', user?.uid, options?.period, options?.from, options?.to]

  return useQuery<OrgReportResult>({
    queryKey,
    queryFn: async (): Promise<OrgReportResult> => {
      if (!user) throw new Error('Non authentifié')
      const token = await user.getIdToken()

      const params = new URLSearchParams()
      if (typeof options === 'string' && options) {
        params.set('period', options)
      } else if (typeof options === 'object' && options) {
        if (options.period) params.set('period', options.period)
        if (options.from) params.set('from', options.from)
        if (options.to) params.set('to', options.to)
      }

      const qs = params.toString()
      const url = qs ? `/api/reporting/org?${qs}` : '/api/reporting/org'
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Erreur serveur')
      }
      return res.json() as Promise<OrgReportResult>
    },
    enabled: !!user?.uid && isSeniorManager,
    staleTime: 0,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true
  })
}

