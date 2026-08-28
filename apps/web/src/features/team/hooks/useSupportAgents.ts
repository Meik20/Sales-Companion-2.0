'use client'

import { useTeamRoleMembers, type TeamRoleMember } from './useTeamRoleMembers'

export type SupportAgent = TeamRoleMember & {
  role: 'support_agent'
}

/**
 * Real-time hook that returns all support agents for the current manager.
 *
 * Delegates to `useTeamRoleMembers` which handles the dual-listener merge
 * between `team_accesses` and `users`, filtering specifically for the
 * `support_agent` role.
 *
 * Any manual toggle of `activated` in Firestore is reflected in the UI
 * within milliseconds — no page refresh required.
 */
export function useSupportAgents() {
  const result = useTeamRoleMembers({ role: 'support_agent' })
  return {
    ...result,
    data: result.data as SupportAgent[]
  }
}
