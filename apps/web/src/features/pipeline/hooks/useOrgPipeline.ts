'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export interface OrgPipelineItem {
  id: string
  companyName?: string
  name?: string
  status: 'prospection' | 'negociation' | 'conclue' | string
  managerUid?: string
  managerName?: string
  managerOrgRole?: string
  userId?: string
  assignedTo?: string
  memberName?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface OrgManagerStats {
  uid: string
  name: string
  email: string
  orgRole: string
  isSenior: boolean
  isCurrent: boolean
  stats: {
    prospection: number
    negociation: number
    conclue: number
    total: number
  }
}

export interface OrgPipelineResult {
  items: OrgPipelineItem[]
  managers: OrgManagerStats[]
  counts: {
    prospection: number
    negociation: number
    conclue: number
    total: number
  }
  orgCode: string
}

interface UseOrgPipelineOptions {
  managerUid?: string
  status?: 'prospection' | 'negociation' | 'conclue'
}

/**
 * Hook — Pipeline consolidé de l'organisation (Senior Manager uniquement).
 *
 * Consomme GET /api/pipeline/org avec filtres optionnels.
 * Désactivé si l'utilisateur n'est pas senior_manager.
 */
export function useOrgPipeline(options: UseOrgPipelineOptions = {}) {
  const { user } = useCurrentUser()
  const isSeniorManager = user?.role === 'manager' && user?.orgRole === 'senior_manager'

  const params = new URLSearchParams()
  if (options.managerUid) params.set('managerUid', options.managerUid)
  if (options.status) params.set('status', options.status)
  const qs = params.toString()

  return useQuery<OrgPipelineResult>({
    queryKey: ['org-pipeline', user?.uid, options.managerUid, options.status],
    queryFn: async (): Promise<OrgPipelineResult> => {
      if (!user) throw new Error('Non authentifié')
      const token = await user.getIdToken()
      const res = await fetch(`/api/pipeline/org${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Erreur serveur')
      }
      return res.json() as Promise<OrgPipelineResult>
    },
    enabled: !!user?.uid && isSeniorManager,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}
