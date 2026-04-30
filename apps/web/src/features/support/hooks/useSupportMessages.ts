import { useEffect, useState } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase' // adapte si besoin

export interface SupportMessage {
  id: string
  content: string
  senderId: string
  senderRole?: string
  createdAt: Timestamp
}

export const useSupportMessages = (threadId: string | null) => {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (!threadId) return

    setLoading(true)

    const q = query(
      collection(db, 'supportThreads', threadId, 'messages'),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SupportMessage[]

        setMessages(data)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [threadId])

  return { messages, loading, error }
}