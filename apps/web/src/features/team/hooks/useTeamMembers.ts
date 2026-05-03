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
  active: boolean
  dailyUsed: number
  dailyLimit: number
}

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

    // Set up real-time listener for team members
    const q = query(collection(db, 'users'), where('managerUid', '==', user.uid))
    
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const membersList = snap.docs
          .map(doc => ({
            uid: doc.id,
            email: doc.data().email || '',
            name: doc.data().name || '',
            role: 'member' as const,
            managerUid: doc.data().managerUid,
            active: doc.data().active ?? false,
            dailyUsed: doc.data().dailyUsed ?? 0,
            dailyLimit: doc.data().dailyLimit ?? 100,
          }))
          .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0)) // Sort active members first
        
        setMembers(membersList)
        setIsLoading(false)
      },
      (error) => {
        console.error('Error loading team members:', error)
        setIsError(true)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user?.uid])

  return {
    data: members,
    isLoading,
    isError,
  }
}
