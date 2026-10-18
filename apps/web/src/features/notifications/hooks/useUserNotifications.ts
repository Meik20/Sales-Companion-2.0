'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
  doc,
  updateDoc,
  writeBatch
} from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type UserNotification = {
  id: string
  userId: string
  type: 'prospect_transfer' | 'prospect_assignment' | 'deadline_reminder' | 'general'
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: string
  metadata?: {
    count?: number
    senderUid?: string
    senderName?: string
    deadline?: string | null
    [key: string]: unknown
  }
}

/**
 * Hook temps réel pour les notifications utilisateur (commerciaux et managers).
 * Écoute Firestore onSnapshot sans polling.
 */
export function useUserNotifications() {
  const { user } = useCurrentUser()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([])
      setLoading(false)
      return
    }

    // Requête filtrée par userId sans orderBy serveur pour éviter l'exigence d'un index composite
    const q = query(
      collection(firestore, 'userNotifications'),
      where('userId', '==', user.uid),
      limit(60)
    )

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const notifs: UserNotification[] = snap.docs.map((docSnap) => {
          const data = docSnap.data()
          let createdAtStr = new Date().toISOString()
          if (data.createdAt?.toDate) {
            createdAtStr = data.createdAt.toDate().toISOString()
          } else if (typeof data.createdAt === 'string') {
            createdAtStr = data.createdAt
          }

          return {
            id: docSnap.id,
            userId: data.userId,
            type: data.type || 'general',
            title: data.title || 'Notification',
            message: data.message || '',
            link: data.link || '/pipeline',
            read: Boolean(data.read),
            createdAt: createdAtStr,
            metadata: data.metadata || {}
          }
        })

        // Tri en mémoire du plus récent au plus ancien
        notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setNotifications(notifs)
        setLoading(false)
      },
      (error) => {
        console.warn('[useUserNotifications] Erreur snapshot:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user?.uid])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = useCallback(async (id: string) => {
    try {
      const ref = doc(firestore, 'userNotifications', id)
      await updateDoc(ref, {
        read: true,
        readAt: new Date().toISOString()
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (err) {
      console.warn('[useUserNotifications] Impossible de marquer comme lu:', err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read)
    if (unread.length === 0) return

    try {
      const batch = writeBatch(firestore)
      for (const n of unread) {
        const ref = doc(firestore, 'userNotifications', n.id)
        batch.update(ref, {
          read: true,
          readAt: new Date().toISOString()
        })
      }
      await batch.commit()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.warn('[useUserNotifications] Impossible de tout marquer comme lu:', err)
    }
  }, [notifications])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  }
}
