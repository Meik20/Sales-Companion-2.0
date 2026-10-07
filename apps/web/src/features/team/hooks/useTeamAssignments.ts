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
  const { user, loading } = useCurrentUser()

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

      // 401/403 are not retriable errors (auth or subscription issue) — return empty
      if (response.status === 401 || response.status === 403) {
        return [] as TeamAssignment[]
      }

      if (!response.ok) {
        throw new Error('Impossible de charger les assignations')
      }

      const json = await response.json()
      return (json.items ?? []) as TeamAssignment[]
    },
    // Wait for auth to be fully resolved before fetching
    enabled: !loading && !!user?.uid,
    // Do not retry on 401/403 — we return [] above, so errors here are real server errors
    retry: 1
  })
}
