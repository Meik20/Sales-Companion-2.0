'use client'

import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

export type TeamMember = {
  uid: string
  email: string
  name: string
  role: 'member'
  managerUid: string
  /** true when the member has completed activation */
  active: boolean
  dailyUsed: number
  dailyLimit: number
}

/**
 * Real-time hook that returns team members for the current manager.
 *
 * A member is considered "active" when EITHER:
 *   - users/{uid}.active     === true   (set during activation)
 *   - users/{uid}.activated  === true   (legacy / manual Firestore toggle)
 *
 * The listener is powered by Firestore onSnapshot so any change — including
 * a manager manually setting activated=true in the Firestore console — is
 * reflected in the UI within milliseconds, with no page refresh needed.
 */
export function useTeamMembers() {
  const { user } = useCurrentUser()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      setMembers([])
      return
    }

    setIsLoading(true)
    setIsError(false)

    // Listen to users whose managerUid matches the current manager
    const q = query(collection(db, 'users'), where('managerUid', '==', user.uid))

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: TeamMember[] = snap.docs.map((doc) => {
          const d = doc.data()
          // Accept either field — supports both legacy and new activation paths
          const isActive = d.active === true || d.activated === true
          return {
            uid:        doc.id,
            email:      d.email      ?? '',
            name:       d.name       ?? '',
            role:       'member' as const,
            managerUid: d.managerUid ?? '',
            active:     isActive,
            dailyUsed:  d.dailyUsed  ?? 0,
            dailyLimit: d.dailyLimit ?? 100,
          }
        })

        // Active members first, then alphabetical by name
        list.sort((a, b) => {
          if (b.active !== a.active) return b.active ? 1 : -1
          return (a.name || a.email).localeCompare(b.name || b.email, 'fr')
        })

        setMembers(list)
        setIsLoading(false)
      },
      (error) => {
        console.error('[useTeamMembers] Firestore error:', error)
        setIsError(true)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user?.uid])

  return { data: members, isLoading, isError }
}

/** Returns only the members that have completed activation */
export function useActiveTeamMembers() {
  const result = useTeamMembers()
  return {
    ...result,
    data: result.data.filter((m) => m.active),
  }
}
