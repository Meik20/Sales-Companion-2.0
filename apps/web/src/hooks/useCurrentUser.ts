'use client'

import { useEffect, useState } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, firestore } from '@/services/firebase/client'

export type CurrentUser = {
  uid: string
  email: string
  name: string
  role: 'independent' | 'manager' | 'member' | 'admin'
  companyId: string | null
  managerUid: string | null
  plan: string
  dailyLimit: number
  dailyUsed: number
  active: boolean
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() } as CurrentUser)
        } else {
          // If no user doc yet, create basic user from Firebase auth
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
          })
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  return { user, loading }
}
