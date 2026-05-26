'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type TeamAssignment = {
  id: string
  managerUid: string
  managerName: string
  memberId: string
  memberName: string
  memberEmail: string
  /** Original prospect / pipeline item id */
  pipelineItemId: string
  /** Pipeline entry created for the member */
  pipelineEntryId?: string
  companyName: string
  status: string
  createdAt: string
  updatedAt: string
}

/**
 * Fetches the manager's team assignments via the server-side API.
 * This avoids direct Firestore client security issues in the browser.
 */
export function useTeamAssignments() {
  const { user } = useCurrentUser()

  return useQuery({
    queryKey: ['team-assignments', user?.uid],
    queryFn: async () => {
      if (!user?.uid) {
        return [] as TeamAssignment[]
      }

      const token = await user.getIdToken()
      const response = await fetch('/api/team/assignments', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Impossible de charger les assignations')
      }

      const json = await response.json()
      return (json.items ?? []) as TeamAssignment[]
    },
    enabled: !!user?.uid
  })
}
