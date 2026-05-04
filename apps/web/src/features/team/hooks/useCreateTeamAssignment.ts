'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type Input = {
  pipelineItemId: string
  memberId: string
}

/**
 * Creates a team assignment via the rewritten /api/team/assignments route.
 * The route writes to Firestore directly (no external backend dependency).
 *
 * On success:
 *  - A `team_assignments` document appears → "Assignations actives" updates in real-time
 *  - A `pipeline` document is created for the member → member sees it in their Pipeline tab
 *  - The pipeline document has `managerUid` set → manager sees it in consolidated view
 */
export function useCreateTeamAssignment() {
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Input) => {
      if (!user?.uid) throw new Error('Non authentifié')

      const token = await user.getIdToken()

      const res = await fetch('/api/team/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          (json as { message?: string }).message ?? `Erreur ${res.status}`
        )
      }
      return json as { success: boolean; assignmentId: string; pipelineEntryId: string }
    },

    onSuccess: () => {
      // Invalidate pipeline caches so both member and manager views refresh
      void queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      void queryClient.invalidateQueries({ queryKey: ['team-assignments'] })
      void queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] })
    },
  })
}
