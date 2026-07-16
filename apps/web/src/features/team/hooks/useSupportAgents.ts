'use client'

import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

export type SupportAgent = {
  uid: string
  email: string
  name: string
  role: 'support_agent'
  managerUid: string
  active: boolean
  accessId?: string
}

export function useSupportAgents() {
  const { user } = useCurrentUser()
  const [agents, setAgents] = useState<SupportAgent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      setAgents([])
      setIsError(false)
      setIsLoading(false)
      return
    }

    const managerUid = user.uid
    setIsLoading(true)
    setIsError(false)

    let accessesMap: Record<string, SupportAgent> = {}
    let usersMap: Record<string, Partial<SupportAgent>> = {}
    let settled = false

    function merge() {
      if (!managerUid) return

      const byEmail: Record<string, SupportAgent> = {}

      for (const a of Object.values(accessesMap)) {
        const key = a.email?.toLowerCase() || a.uid
        byEmail[key] = a
      }

      for (const [uid, u] of Object.entries(usersMap)) {
        const key = (u.email || '').toLowerCase() || uid
        if (byEmail[key]) {
          byEmail[key] = {
            ...byEmail[key],
            uid: uid,
            name: u.name || byEmail[key].name,
            email: u.email || byEmail[key].email,
            active: u.active ?? byEmail[key].active
          }
        } else {
          byEmail[key] = {
            uid,
            email: u.email ?? '',
            name: u.name ?? '',
            role: 'support_agent',
            managerUid: managerUid,
            active: u.active ?? false
          }
        }
      }

      const list = Object.values(byEmail)
      list.sort((a, b) => {
        if (b.active !== a.active) return b.active ? 1 : -1
        return (a.name || a.email).localeCompare(b.name || b.email, 'fr')
      })

      setAgents(list)
      if (!settled) {
        settled = true
        setIsLoading(false)
      }
    }

    // Listener 1: team_accesses for support_agents
    const qAccesses = query(
      collection(db, 'team_accesses'),
      where('managerUid', '==', managerUid),
      where('role', '==', 'support_agent')
    )
    const unsubAccesses = onSnapshot(
      qAccesses,
      (snap) => {
        accessesMap = {}
        snap.docs.forEach((d) => {
          const data = d.data()
          const isActive =
            data.activated === true || data.status === 'active' || data.active === true

          const fullName =
            [data.firstname, data.lastname].filter(Boolean).join(' ') || data.name || ''

          const uid = data.firebaseUid || d.id

          accessesMap[uid] = {
            uid,
            accessId: d.id,
            email: data.email ?? '',
            name: fullName,
            role: 'support_agent',
            managerUid: managerUid,
            active: isActive
          }
        })
        merge()
      },
      (error) => {
        console.error('[useSupportAgents] team_accesses error:', error)
        setIsError(true)
        setIsLoading(false)
      }
    )

    // Listener 2: users for support_agents
    const qUsers = query(
      collection(db, 'users'),
      where('managerUid', '==', managerUid),
      where('role', '==', 'support_agent')
    )
    const unsubUsers = onSnapshot(
      qUsers,
      (snap) => {
        usersMap = {}
        snap.docs.forEach((d) => {
          const data = d.data()
          const isActive =
            data.activated === true || data.active === true || data.status === 'active'

          usersMap[d.id] = {
            uid: d.id,
            email: data.email ?? '',
            name: data.name ?? '',
            active: isActive,
            managerUid: data.managerUid ?? managerUid
          }
        })
        merge()
      },
      (error) => {
        console.warn('[useSupportAgents] users error:', error)
      }
    )

    return () => {
      unsubAccesses()
      unsubUsers()
    }
  }, [user?.uid])

  return { data: agents, isLoading, isError }
}
