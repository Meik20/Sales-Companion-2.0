'use client'

import { useEffect, useState } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  doc,
  updateDoc,
  writeBatch
} from 'firebase/firestore'
import { firestore } from '@/services/firebase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type AdminNotification = {
  id: string
  type: 'payment_submitted' | 'new_manager' | 'support_ticket'
  title: string
  message: string
  userId: string
  userEmail: string
  reference?: string | null
  link?: string | null
  read: boolean
  createdAt: string
}

/**
 * Hook temps réel pour les notifications admin.
 * Utilise onSnapshot Firestore — les mises à jour arrivent automatiquement
 * sans polling. Seul l'admin voit ses notifications.
 */
export function useAdminNotifications() {
  const { user } = useCurrentUser()
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setLoading(false)
      return
    }

    const q = query(
      collection(firestore, 'adminNotifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const notifs = snap.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            type: data.type,
            title: data.title,
            message: data.message,
            userId: data.userId,
            userEmail: data.userEmail,
            reference: data.reference ?? null,
            link: data.link ?? null,
            read: data.read ?? false,
            createdAt:
              data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString()
          } as AdminNotification
        })
        setNotifications(notifs)
        setLoading(false)
      },
      (err) => {
        console.error('[useAdminNotifications] Firestore error:', err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markAsRead(id: string) {
    try {
      await updateDoc(doc(firestore, 'adminNotifications', id), { read: true })
    } catch (err) {
      console.error('[useAdminNotifications] markAsRead failed:', err)
    }
  }

  async function markAllAsRead() {
    const unread = notifications.filter((n) => !n.read)
    if (!unread.length) return
    try {
      const batch = writeBatch(firestore)
      unread.forEach((n) => {
        batch.update(doc(firestore, 'adminNotifications', n.id), { read: true })
      })
      await batch.commit()
    } catch (err) {
      console.error('[useAdminNotifications] markAllAsRead failed:', err)
    }
  }

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}
