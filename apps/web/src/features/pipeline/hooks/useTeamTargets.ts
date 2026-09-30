'use client'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/hooks/useToast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type MemberTarget = {
  id?: string
  memberId: string
  memberName?: string
  targetVolume: number | null
  targetValue: number | null
  period?: string | null
}

/** Fetches all targets defined by the manager */
export function useTeamTargets(memberId?: string) {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['teamTargets', memberId ?? 'all'],
    enabled: !!user,
    queryFn: async () => {
      const token = await user!.getIdToken()
      const params = new URLSearchParams()
      if (memberId) params.set('memberId', memberId)
      const res = await fetch(
        `/api/team/targets${params.toString() ? `?${params}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
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
      qc.invalidateQueries({ queryKey: ['teamTargets'] })
      pushToast({ type: 'success', title: 'Objectifs enregistrés ✅' })
    },
    onError: (err: Error) => {
      pushToast({ type: 'error', title: "Erreur", description: err.message })
    }
  })
}
