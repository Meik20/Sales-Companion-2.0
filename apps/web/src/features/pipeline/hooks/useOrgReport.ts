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
    total: number
  }
  conversionRate: number
  totalConcludedAmount?: number
  totalPipelineValue?: number
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

/**
 * Hook — KPIs consolidés de l'organisation (Senior Manager uniquement).
 * Consomme GET /api/reporting/org.
 */
export function useOrgReport() {
  const { user } = useCurrentUser()
  const isSeniorManager = user?.role === 'manager' && user?.orgRole === 'senior_manager'

  return useQuery<OrgReportResult>({
    queryKey: ['org-report', user?.uid],
    queryFn: async (): Promise<OrgReportResult> => {
      if (!user) throw new Error('Non authentifié')
      const token = await user.getIdToken()
      const res = await fetch('/api/reporting/org', {
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

