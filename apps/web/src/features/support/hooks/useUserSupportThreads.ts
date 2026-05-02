import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

export interface SupportThread {
  id: string
  userId: string
  userEmail: string
  userName: string
  subject: string
  status: 'open' | 'resolved'
  createdAt: Timestamp
  updatedAt: Timestamp
}

export const useUserSupportThreads = (userId: string | null) => {
  const [threads, setThreads] = useState<SupportThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (!userId) return

    setLoading(true)

    const q = query(
      collection(firestore, 'support_threads'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SupportThread[]

        setThreads(data)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userId])

  return { threads, loading, error }
}