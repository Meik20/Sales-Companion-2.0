'use client'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type MemberTarget = {
  id?: string
  managerUid?: string
  orgCode?: string | null
  memberId: string
  memberName?: string
  targetVolume: number | null
  targetValue: number | null
  period?: string | null
}

/** Fetches targets defined by the manager (or all org managers if senior manager).
 * @param period — période YYYY-MM à charger ; si fourni, désactive la sanitisation
 *                 automatique des objectifs expirés (lecture historique M-1, M-2...)
 */
export function useTeamTargets(memberId?: string, managerUid?: string, period?: string) {
  const { user } = useCurrentUser()

  return useQuery({
    // La période fait partie de la queryKey : changement de mois ? refetch
    queryKey: ['teamTargets', memberId ?? 'all', managerUid ?? 'all', period ?? 'current'],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken()
      const params = new URLSearchParams()
      if (memberId) params.set('memberId', memberId)
      if (managerUid) params.set('managerUid', managerUid)
      // Transmettre la période pour désactiver la sanitisation des mois historiques côté API
      if (period) params.set('period', period)
      const res = await fetch(`/api/team/targets${params.toString() ? `?${params}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Impossible de charger les objectifs')
      const json = await res.json()
      return json.targets as MemberTarget[]
    }
  })
}

/** Creates or updates a member's target */
export function useSaveTeamTarget() {
  const { user } = useCurrentUser()
  const { pushToast } = useToast()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload: MemberTarget) => {
      const token = await user!.getIdToken()
      const res = await fetch('/api/team/targets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erreur serveur' }))
        throw new Error(err.message ?? 'Erreur sauvegarde')
      }
      return res.json()
    },
    onSuccess: () => {
      // Invalidation rÃ©active dynamique Ã  tous les niveaux hiÃ©rarchiques (TM et SM)
      qc.invalidateQueries({ queryKey: ['teamTargets'] })
      qc.invalidateQueries({ queryKey: ['orgPipeline'] })
      qc.invalidateQueries({ queryKey: ['pipeline'] })
      qc.invalidateQueries({ queryKey: ['reportingOrg'] })
      qc.invalidateQueries({ queryKey: ['reporting'] })
      pushToast({ type: 'success', title: 'Objectifs enregistrÃ©s' })
    },
    onError: (err: Error) => {
      pushToast({ type: 'error', title: 'Erreur', description: err.message })
    }
  })
}
