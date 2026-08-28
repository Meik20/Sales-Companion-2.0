'use client'

import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { PLAN_LIMITS } from '@sales-companion/shared'

/**
 * Generic member shape — shared by TeamMember and SupportAgent.
 * Extend with role-specific fields in derived types if needed.
 */
export type TeamRoleMember = {
  uid: string
  email: string
  name: string
  role: string
  managerUid: string
  active: boolean
  accessId?: string
  magicCode?: string
  dailyUsed?: number
  dailyLimit?: number
}

export type UseTeamRoleMembersOptions = {
  /**
   * When provided, both `team_accesses` and `users` queries are further
   * filtered by `where('role', '==', role)`.
   * When omitted, all non-support_agent records are returned.
   */
  role?: string
  /**
   * Exclude a specific role from the results (useful to exclude
   * support_agent from the commercial team list).
   */
  excludeRole?: string
}

/**
 * Real-time hook — listens to TWO Firestore sources in parallel:
 *
 *  1. `team_accesses` where managerUid == currentUser.uid
 *     → Primary source of truth for ALL members (created by manager).
 *     → A member is "active" when `activated === true`.
 *
 *  2. `users` where managerUid == currentUser.uid
 *     → Enriches data (dailyUsed, dailyLimit) once a member has registered.
 *
 * The two lists are merged by email, deduplicating so a member never
 * appears twice regardless of which collection is newer.
 *
 * Any manual toggle of `activated` in the Firestore console is reflected
 * in the UI within milliseconds with no page refresh.
 */
export function useTeamRoleMembers(options: UseTeamRoleMembersOptions = {}) {
  const { role, excludeRole } = options
  const { user } = useCurrentUser()
  const [members, setMembers] = useState<TeamRoleMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      setMembers([])
      setIsError(false)
      setIsLoading(false)
      return
    }

    const managerUid = user.uid
    setIsLoading(true)
    setIsError(false)

    let accessesMap: Record<string, TeamRoleMember> = {}
    let usersMap: Record<string, Partial<TeamRoleMember>> = {}
    let settled = false

    function merge() {
      if (!managerUid) return

      const byEmail: Record<string, TeamRoleMember> = {}

      for (const m of Object.values(accessesMap)) {
        const key = m.email?.toLowerCase() || m.uid
        byEmail[key] = m
      }

      for (const [uid, u] of Object.entries(usersMap)) {
        const key = (u.email || '').toLowerCase() || uid
        if (byEmail[key]) {
          byEmail[key] = {
            ...byEmail[key],
            uid,
            name: u.name || byEmail[key].name,
            email: u.email || byEmail[key].email,
            active: u.active ?? byEmail[key].active,
            dailyUsed: u.dailyUsed ?? byEmail[key].dailyUsed,
            dailyLimit: u.dailyLimit ?? byEmail[key].dailyLimit
          }
        } else {
          byEmail[key] = {
            uid,
            email: u.email ?? '',
            name: u.name ?? '',
            role: role ?? 'member',
            managerUid,
            active: u.active ?? false,
            dailyUsed: u.dailyUsed ?? 0,
            dailyLimit: u.dailyLimit ?? PLAN_LIMITS.enterprise
          }
        }
      }

      const list = Object.values(byEmail)
      list.sort((a, b) => {
        if (b.active !== a.active) return b.active ? 1 : -1
        return (a.name || a.email).localeCompare(b.name || b.email, 'fr')
      })

      setMembers(list)
      if (!settled) {
        settled = true
        setIsLoading(false)
      }
    }

    // ── Listener 1 : team_accesses ─────────────────────────────────────────
    const accessesBaseQuery = query(
      collection(db, 'team_accesses'),
      where('managerUid', '==', managerUid),
      ...(role ? [where('role', '==', role)] : [])
    )
    const unsubAccesses = onSnapshot(
      accessesBaseQuery,
      (snap) => {
        accessesMap = {}
        snap.docs.forEach((d) => {
          const data = d.data()

          // Exclude unwanted roles
          if (excludeRole && data.role === excludeRole) return

          const isActive =
            data.activated === true || data.status === 'active' || data.active === true

          const fullName =
            [data.firstname, data.lastname].filter(Boolean).join(' ') || data.name || ''

          const uid = data.firebaseUid || d.id
          const today = new Date().toISOString().split('T')[0]
          const currentDailyUsed = data.lastResetDate === today ? (data.dailyUsed ?? 0) : 0

          accessesMap[uid] = {
            uid,
            accessId: data.accessId || d.id,
            email: data.email ?? '',
            name: fullName,
            role: data.role ?? role ?? 'member',
            managerUid,
            active: isActive,
            dailyUsed: currentDailyUsed,
            dailyLimit: data.dailyLimit ?? PLAN_LIMITS.enterprise,
            magicCode: data.magicCode
          }
        })
        merge()
      },
      (error) => {
        console.error('[useTeamRoleMembers] team_accesses error:', error)
        setIsError(true)
        setIsLoading(false)
      }
    )

    // ── Listener 2 : users ─────────────────────────────────────────────────
    const usersBaseQuery = query(
      collection(db, 'users'),
      where('managerUid', '==', managerUid),
      ...(role ? [where('role', '==', role)] : [])
    )
    const unsubUsers = onSnapshot(
      usersBaseQuery,
      (snap) => {
        usersMap = {}
        snap.docs.forEach((d) => {
          const data = d.data()

          // Exclude unwanted roles
          if (excludeRole && data.role === excludeRole) return

          const isActive =
            data.activated === true || data.active === true || data.status === 'active'

          const today = new Date().toISOString().split('T')[0]
          const currentDailyUsed = data.lastResetDate === today ? (data.dailyUsed ?? 0) : 0

          usersMap[d.id] = {
            uid: d.id,
            email: data.email ?? '',
            name: data.name ?? '',
            active: isActive,
            dailyUsed: currentDailyUsed,
            dailyLimit: data.dailyLimit ?? PLAN_LIMITS.enterprise,
            managerUid: data.managerUid ?? managerUid
          }
        })
        merge()
      },
      (error) => {
        // Non-fatal — users collection may not have records yet
        console.warn('[useTeamRoleMembers] users error:', error)
      }
    )

    return () => {
      unsubAccesses()
      unsubUsers()
    }
  }, [user?.uid, role, excludeRole])

  return { data: members, isLoading, isError }
}
