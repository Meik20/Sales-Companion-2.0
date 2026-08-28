'use client'

import { useTeamRoleMembers, type TeamRoleMember } from './useTeamRoleMembers'

export type TeamMember = TeamRoleMember & {
  role: 'member'
  dailyUsed: number
  dailyLimit: number
}

/**
 * Real-time hook that returns all commercial team members for the current manager.
 *
 * Delegates to `useTeamRoleMembers` which handles the dual-listener merge
 * between `team_accesses` and `users`, automatically excluding support_agents.
 *
 * Any manual toggle of `activated` in Firestore is reflected in the UI
 * within milliseconds — no page refresh required.
 */
export function useTeamMembers() {
  const result = useTeamRoleMembers({ excludeRole: 'support_agent' })
  return {
    ...result,
    data: result.data as TeamMember[]
  }
}

/** Convenience hook — returns only active (activated) members */
export function useActiveTeamMembers() {
  const result = useTeamMembers()
  return {
    ...result,
    data: result.data.filter((m) => m.active)
  }
}
