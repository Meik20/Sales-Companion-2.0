'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
  doc,
  updateDoc
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
 * Hook hybride temps réel & API pour les notifications utilisateur (commerciaux et managers).
 * Combine onSnapshot Firestore pour l'immédiateté et /api/notifications en fallback fiable.
 */
export function useUserNotifications() {
  const { user } = useCurrentUser()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [loading, setLoading] = useState(true)
  const isMountedRef = useRef(true)

  // 1. Récupération fiable côté serveur via /api/notifications
  const fetchFromApi = useCallback(async () => {
    if (!user?.uid) return
    try {
      const token = await user.getIdToken?.()
      if (!token) return

      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return

      const data = await res.json()
      if (Array.isArray(data.notifications) && isMountedRef.current) {
        setNotifications(data.notifications)
        setLoading(false)
      }
    } catch (err) {
      console.warn('[useUserNotifications] fetchFromApi error:', err)
    }
  }, [user])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 2. Chargement initial via API + rafraîchissement doux
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([])
      setLoading(false)
      return
    }

    // Appel initial immédiat
    void fetchFromApi()

    // Polling doux toutes les 30 secondes en cas de problème de connexion Firestore
    const interval = setInterval(() => {
      void fetchFromApi()
    }, 30000)

    return () => clearInterval(interval)
  }, [user?.uid, fetchFromApi])

  // 3. Écoute Firestore temps réel (onSnapshot)
  useEffect(() => {
    if (!user?.uid) return

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

        notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        if (isMountedRef.current) {
          setNotifications(notifs)
          setLoading(false)
        }
      },
      (error) => {
        // En cas d'erreur de règles Firestore, on s'appuie sur l'API sans casser l'UI
        console.warn('[useUserNotifications] onSnapshot fallback vers API:', error.message)
        void fetchFromApi()
      }
    )

    return () => unsubscribe()
  }, [user?.uid, fetchFromApi])

  const unreadCount = notifications.filter((n) => !n.read).length

  // 4. Marquer comme lu (optimiste + double enregistrement API + Firestore client)
  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )

      try {
        // Enregistrement via API sécurisée
        const token = await user?.getIdToken?.()
        if (token) {
          await fetch('/api/notifications', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ id })
          })
        }

        // Tenter également Firestore direct
        const ref = doc(firestore, 'userNotifications', id)
        await updateDoc(ref, {
          read: true,
          readAt: new Date().toISOString()
        }).catch(() => {})
      } catch (err) {
        console.warn('[useUserNotifications] Erreur marquage notification:', err)
      }
    },
    [user]
  )

  // 5. Tout marquer comme lu
  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read)
    if (unread.length === 0) return

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

    try {
      const token = await user?.getIdToken?.()
      if (token) {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ all: true })
        })
      }
    } catch (err) {
      console.warn('[useUserNotifications] Erreur tout marquer comme lu:', err)
    }
  }, [notifications, user])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchFromApi
  }
}
