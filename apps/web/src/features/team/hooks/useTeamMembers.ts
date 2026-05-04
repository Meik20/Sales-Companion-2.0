'use client'

import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore'

export type TeamMember = {
  uid: string
  email: string
  name: string
  role: 'member'
  managerUid: string
  /** true when activated === true in team_accesses OR active/activated in users */
  active: boolean
  dailyUsed: number
  dailyLimit: number
  /** Source document id in team_accesses */
  accessId?: string
}

/**
 * Real-time hook — listens to TWO Firestore sources in parallel:
 *
 *  1. `team_accesses` where managerUid == currentUser.uid
 *     → Primary source of truth for ALL members (created by manager).
 *     → A member is "active" when `activated === true` (manual or via form).
 *
 *  2. `users` where managerUid == currentUser.uid
 *     → Enriches data (dailyUsed, dailyLimit) once a member has registered.
 *
 * The two lists are merged by firebaseUid / email, deduplicating so a member
 * never appears twice regardless of which collection is newer.
 *
 * Any manual toggle of `activated` in the Firestore console is reflected
 * in the UI within milliseconds with no page refresh.
 */
export function useTeamMembers() {
  const { user } = useCurrentUser()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    // ── SECURITY: Strict validation of current user before proceeding
    if (!user?.uid) { 
      setMembers([])
      setIsError(false)
      setIsLoading(false)
      return 
    }

    // ── Capture manager UID once to ensure consistent reference
    const managerUid = user.uid

    setIsLoading(true)
    setIsError(false)

    // ── State for each source ──────────────────────────────────────────────
    let accessesMap: Record<string, TeamMember> = {}
    let usersMap:    Record<string, Partial<TeamMember>> = {}
    let settled = false

    function merge() {
      // ── SECURITY: Double-check manager context before processing data
      if (!managerUid) {
        console.warn('[useTeamMembers] merge() called without valid managerUid')
        return
      }

      // Start from team_accesses (source of truth)
      const byEmail: Record<string, TeamMember> = {}

      for (const m of Object.values(accessesMap)) {
        const key = m.email?.toLowerCase() || m.uid
        byEmail[key] = m
      }

      // Enrich/override with users data (has dailyUsed etc.)
      for (const [uid, u] of Object.entries(usersMap)) {
        const key = (u.email || '').toLowerCase() || uid
        if (byEmail[key]) {
          byEmail[key] = {
            ...byEmail[key],
            uid:       uid,
            name:      u.name      || byEmail[key].name,
            email:     u.email     || byEmail[key].email,
            active:    (u.active ?? byEmail[key].active),
            dailyUsed: u.dailyUsed ?? byEmail[key].dailyUsed,
            dailyLimit:u.dailyLimit ?? byEmail[key].dailyLimit,
          }
        } else {
          // User exists in `users` but not in team_accesses (edge case)
          byEmail[key] = {
            uid,
            email:     u.email     ?? '',
            name:      u.name      ?? '',
            role:      'member',
            managerUid: managerUid,
            active:    u.active    ?? false,
            dailyUsed: u.dailyUsed ?? 0,
            dailyLimit:u.dailyLimit ?? 100,
          }
        }
      }

      const list = Object.values(byEmail)
      list.sort((a, b) => {
        if (b.active !== a.active) return b.active ? 1 : -1
        return (a.name || a.email).localeCompare(b.name || b.email, 'fr')
      })

      setMembers(list)
      if (!settled) { settled = true; setIsLoading(false) }
    }

    // ── Listener 1 : team_accesses ─────────────────────────────────────────
    const qAccesses = query(
      collection(db, 'team_accesses'),
      where('managerUid', '==', managerUid)
    )
    const unsubAccesses = onSnapshot(
      qAccesses,
      (snap) => {
        accessesMap = {}
        snap.docs.forEach((d) => {
          const data = d.data()
          // A member is "active" if activated===true OR status==='active'
          const isActive =
            data.activated === true ||
            data.status    === 'active' ||
            data.active    === true

          const fullName = [data.firstname, data.lastname]
            .filter(Boolean).join(' ') || data.name || ''

          const uid = data.firebaseUid || d.id

          accessesMap[uid] = {
            uid,
            accessId:  d.id,
            email:     data.email      ?? '',
            name:      fullName,
            role:      'member',
            managerUid: managerUid,
            active:    isActive,
            dailyUsed: data.dailyUsed  ?? 0,
            dailyLimit: data.dailyLimit ?? 100,
          }
        })
        merge()
      },
      (error) => {
        console.error('[useTeamMembers] team_accesses error:', error)
        setIsError(true)
        setIsLoading(false)
      }
    )

    // ── Listener 2 : users ─────────────────────────────────────────────────
    const qUsers = query(
      collection(db, 'users'),
      where('managerUid', '==', managerUid)
    )
    const unsubUsers = onSnapshot(
      qUsers,
      (snap) => {
        usersMap = {}
        snap.docs.forEach((d) => {
          const data = d.data()
          const isActive =
            data.activated === true ||
            data.active    === true  ||
            data.status    === 'active'

          usersMap[d.id] = {
            uid:       d.id,
            email:     data.email     ?? '',
            name:      data.name      ?? '',
            active:    isActive,
            dailyUsed: data.dailyUsed  ?? 0,
            dailyLimit: data.dailyLimit ?? 100,
            managerUid: data.managerUid ?? managerUid,
          }
        })
        merge()
      },
      (error) => {
        // Non-fatal — users collection may not have records yet
        console.warn('[useTeamMembers] users error:', error)
      }
    )

    return () => {
      unsubAccesses()
      unsubUsers()
    }
  }, [user?.uid])

  return { data: members, isLoading, isError }
}

/** Convenience hook — returns only active (activated) members */
export function useActiveTeamMembers() {
  const result = useTeamMembers()
  return {
    ...result,
    data: result.data.filter((m) => m.active),
  }
}
