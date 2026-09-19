'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, firestore } from '@/services/firebase/client'
import { updateDoc, serverTimestamp } from 'firebase/firestore'
import { PLAN_LIMITS } from '@sales-companion/shared'

export type CurrentUser = {
  uid: string
  email: string
  name: string
  role: 'independent' | 'manager' | 'member' | 'admin' | 'support_agent'
  companyId?: string | null
  companyName?: string | null
  company?: string | null
  sector?: string | null
  industry?: string | null
  region?: string | null
  phone?: string | null
  city?: string | null
  managerUid: string | null
  linkedManagerUids?: string[] // ← Managers liés pour l'agent support
  accessId?: string | null // ← Access ID généré par le Manager (ex: "prenomnom@entreprise")
  plan: string
  dailyLimit: number
  dailyUsed: number
  active: boolean
  getIdToken: (forceRefresh?: boolean) => Promise<string>
}

interface UserContextValue {
  user: CurrentUser | null
  loading: boolean
}

const UserContext = createContext<UserContextValue | null>(null)

function useCurrentUserSource(): UserContextValue {
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

      // Update lastLoginAt once per browser session (not on every page navigation)
      const sessionKey = `lastLogin_written_${firebaseUser.uid}`
      if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(sessionKey)) {
        updateDoc(userDocRef, { lastLoginAt: serverTimestamp() }).catch(() => {})
        sessionStorage.setItem(sessionKey, '1')
      }

      unsubscribeSnapshot = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data()

            // Sync email if changed & verified in Firebase Auth
            if (firebaseUser.email && data.email !== firebaseUser.email) {
              updateDoc(userDocRef, { email: firebaseUser.email }).catch((err) => {
                console.error("Failed to sync email to Firestore:", err)
              })
            }

            const today = new Date().toISOString().slice(0, 10)
            const userPlan = (data.plan || 'free') as keyof typeof PLAN_LIMITS
            const isMonthly = userPlan === 'free'
            const isSamePeriod = isMonthly
              ? (data.lastResetDate ? data.lastResetDate.slice(0, 7) === today.slice(0, 7) : false)
              : (data.lastResetDate === today)
            const currentDailyUsed = isSamePeriod ? (data.dailyUsed ?? 0) : 0
            const resolvedDailyLimit = PLAN_LIMITS[userPlan] ?? 10

            setUser({
              uid: firebaseUser.uid,
              ...data,
              plan: userPlan,
              dailyLimit: resolvedDailyLimit,
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

/**
 * Fournisseur React Context pour l'utilisateur courant.
 * Garantit qu'un SEUL écouteur onSnapshot Firestore est actif pour toute l'application,
 * évitant ainsi d'épuiser les quotas de lecture Firestore.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const value = useCurrentUserSource()
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

/**
 * Hook d'accès à l'utilisateur courant.
 * Lit directement depuis le UserContext partagé (0 requête Firestore supplémentaire).
 * Dispose d'un fallback direct si utilisé en dehors du UserProvider (ex: tests).
 */
export function useCurrentUser() {
  const context = useContext(UserContext)
  if (context !== null) {
    return context
  }
  // Fallback si appelé hors d'un UserProvider
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useCurrentUserSource()
}
