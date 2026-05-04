'use client'

import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'

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
 * Real-time listener on `team_assignments` for the current manager.
 * Updates instantly when a new assignment is saved — no polling.
 */
export function useTeamAssignments() {
  const { user } = useCurrentUser()
  const [data, setData]       = useState<TeamAssignment[]>([])
  const [isLoading, setLoading] = useState(false)
  const [isError, setError]   = useState(false)

  useEffect(() => {
    if (!user?.uid) { setData([]); return }

    setLoading(true)
    setError(false)

    const q = query(
      collection(db, 'team_assignments'),
      where('managerUid', '==', user.uid)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: TeamAssignment[] = snap.docs.map((doc) => {
          const d = doc.data()
          return {
            id:              doc.id,
            managerUid:      d.managerUid      ?? '',
            managerName:     d.managerName     ?? '',
            memberId:        d.memberId        ?? '',
            memberName:      d.memberName      ?? '',
            memberEmail:     d.memberEmail     ?? '',
            pipelineItemId:  d.pipelineItemId  ?? '',
            pipelineEntryId: d.pipelineEntryId ?? '',
            companyName:     d.companyName     ?? d.pipelineItemId ?? '',
            status:          d.status          ?? 'active',
            createdAt:       d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
            updatedAt:       d.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          }
        })

        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setData(list)
        setLoading(false)
      },
      (err) => {
        console.error('[useTeamAssignments]', err)
        setError(true)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [user?.uid])

  return { data, isLoading, isError }
}
