/**
 * @deprecated Ce hook n'est actuellement pas utilisé dans l'application.
 * La logique équivalente est gérée directement dans `support/page.tsx`
 * via un onSnapshot inline, ce qui évite de doubler les listeners Firestore.
 *
 * Si une future fonctionnalité nécessite ce hook, le réactiver et supprimer
 * les useEffect correspondants dans support/page.tsx pour éviter les doublons.
 */

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'

export interface SupportMessage {
  id: string
  content: string
  senderId: string
  senderRole?: string
  createdAt: Timestamp
}

/** @deprecated — non utilisé. Voir support/page.tsx */
export const useSupportMessages = (threadId: string | null) => {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (!threadId) return

    setLoading(true)

    const q = query(
      collection(firestore, 'support_threads', threadId, 'messages'),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
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
