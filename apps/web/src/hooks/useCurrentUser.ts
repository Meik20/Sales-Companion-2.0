'use client'

import { useEffect, useState } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, firestore } from '@/services/firebase/client'
import { updateDoc, serverTimestamp } from 'firebase/firestore'

export type CurrentUser = {
  uid: string
  email: string
  name: string
  role: 'independent' | 'manager' | 'member' | 'admin'
  companyId: string | null
  companyName?: string | null
  managerUid: string | null
  accessId?: string | null // ← Access ID généré par le Manager (ex: "prenomnom@entreprise")
  plan: string
  dailyLimit: number
  dailyUsed: number
  active: boolean
  getIdToken: (forceRefresh?: boolean) => Promise<string>
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null

    const unsubscribeAuth = auth.onAuthStateChanged((firebaseUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot()
        unsubscribeSnapshot = null
      }

      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }

      const userDocRef = doc(firestore, 'users', firebaseUser.uid)

      // Update lastLoginAt once per session (simplified)
      updateDoc(userDocRef, { lastLoginAt: serverTimestamp() }).catch(() => {})

      unsubscribeSnapshot = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data()
            const today = new Date().toISOString().split('T')[0]
            const currentDailyUsed = data.lastResetDate === today ? (data.dailyUsed ?? 0) : 0

            setUser({
              uid: firebaseUser.uid,
              ...data,
              dailyUsed: currentDailyUsed,
              getIdToken: (forceRefresh?: boolean) => firebaseUser.getIdToken(forceRefresh)
            } as CurrentUser)
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || '',
              role: 'independent',
              companyId: null,
              managerUid: null,
              plan: 'free',
              dailyLimit: 10,
              dailyUsed: 0,
              active: true,
              getIdToken: (forceRefresh?: boolean) => firebaseUser.getIdToken(forceRefresh)
            })
          }
          setLoading(false)
        },
        (error) => {
          console.error('Error fetching user data:', error)
          setUser(null)
          setLoading(false)
        }
      )
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot()
      }
    }
  }, [])

  return { user, loading }
}
