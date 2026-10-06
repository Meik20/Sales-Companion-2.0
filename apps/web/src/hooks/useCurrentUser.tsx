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
  country?: string | null
  companyId?: string | null
  companyName?: string | null
  orgCode?: string | null
  orgRole?: 'senior_manager' | 'team_manager' | null
  niu?: string | null
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
  subscriptionExpiresAt?: string | null
  subscriptionStartedAt?: string | null
  subscriptionExpired?: boolean
  dailyLimit: number
  dailyUsed: number
  active: boolean
  getIdToken: (forceRefresh?: boolean) => Promise<string>
}

const SESSION_CACHE_KEY = 'sc_user_profile_cache'

function getCachedUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.uid) return null
    return {
      ...parsed,
      getIdToken: async (forceRefresh?: boolean) => {
        if (auth.currentUser) return auth.currentUser.getIdToken(forceRefresh)
        return ''
      }
    }
  } catch {
    return null
  }
}

function saveCachedUser(u: CurrentUser | null) {
  if (typeof window === 'undefined') return
  try {
    if (!u) {
      sessionStorage.removeItem(SESSION_CACHE_KEY)
    } else {
      const { getIdToken: _, ...serializable } = u
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(serializable))
    }
  } catch {
    // Ignore storage quota errors
  }
}

interface UserContextValue {
  user: CurrentUser | null
  loading: boolean
}

const UserContext = createContext<UserContextValue | null>(null)

function useCurrentUserSource(): UserContextValue {
  const [user, setUser] = useState<CurrentUser | null>(() => getCachedUser())
  const [loading, setLoading] = useState<boolean>(() => !getCachedUser())

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null
    let prevPlan: string | null = null
    let expiryTimer: NodeJS.Timeout | null = null

    const unsubscribeAuth = auth.onAuthStateChanged((firebaseUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot()
        unsubscribeSnapshot = null
      }
      if (expiryTimer) {
        clearTimeout(expiryTimer)
        expiryTimer = null
      }

      if (!firebaseUser) {
        setUser(null)
        saveCachedUser(null)
        setLoading(false)
        prevPlan = null
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

            // ── Tracking horaire : Vérification de l'échéance à minuit (30ème jour) ──
            const rawExpiresAt = (data.subscriptionExpiresAt ?? data.planExpiresAt ?? null) as string | null
            const hasExpired =
              Boolean(rawExpiresAt) &&
              !isNaN(new Date(rawExpiresAt!).getTime()) &&
              Date.now() >= new Date(rawExpiresAt!).getTime()

            let effectivePlan = (data.plan || 'free') as keyof typeof PLAN_LIMITS

            if (hasExpired && effectivePlan !== 'free') {
              // Rétrogradation immédiate côté client vers "free"
              effectivePlan = 'free'
              // Déclencher la persistance Firestore côté serveur
              firebaseUser.getIdToken().then((token) => {
                fetch('/api/subscription/check-expiry', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` }
                }).catch(() => {})
              }).catch(() => {})
            }

            // Minuteur automatique à minuit si l'échéance est dans les prochaines 24h
            if (rawExpiresAt && !hasExpired && effectivePlan !== 'free') {
              const msUntilMidnight = new Date(rawExpiresAt).getTime() - Date.now()
              if (msUntilMidnight > 0 && msUntilMidnight <= 86400000) {
                if (expiryTimer) clearTimeout(expiryTimer)
                expiryTimer = setTimeout(() => {
                  firebaseUser.getIdToken(true).catch(() => {})
                  firebaseUser.getIdToken().then((token) => {
                    fetch('/api/subscription/check-expiry', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => {})
                  }).catch(() => {})
                }, msUntilMidnight)
              }
            }

            const today = new Date().toISOString().slice(0, 10)
            const userPlan = effectivePlan
            const isMonthly = userPlan === 'free'
            const isSamePeriod = isMonthly
              ? (data.lastResetDate ? data.lastResetDate.slice(0, 7) === today.slice(0, 7) : false)
              : (data.lastResetDate === today)
            const currentDailyUsed = isSamePeriod ? (data.dailyUsed ?? 0) : 0
            const resolvedDailyLimit = PLAN_LIMITS[userPlan] ?? 10

            // ── Détection de surclassement de plan en direct ─────────────────
            if (prevPlan !== null && prevPlan === 'free' && userPlan !== 'free') {
              firebaseUser.getIdToken(true).catch(() => {})
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('sc:plan-upgraded', { detail: { newPlan: userPlan, oldPlan: prevPlan } })
                )
              }
            }

            // ── Détection de rétrogradation vers "free" en direct ────────────
            if (prevPlan !== null && prevPlan !== 'free' && userPlan === 'free') {
              firebaseUser.getIdToken(true).catch(() => {})
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('sc:plan-downgraded', {
                    detail: {
                      newPlan: 'free',
                      oldPlan: prevPlan,
                      expired: hasExpired
                    }
                  })
                )
              }
            }
            prevPlan = userPlan

            const currentUserObj = {
              uid: firebaseUser.uid,
              ...data,
              plan: userPlan,
              subscriptionExpiresAt: rawExpiresAt,
              subscriptionExpired: hasExpired || Boolean(data.subscriptionExpired),
              dailyLimit: resolvedDailyLimit,
              dailyUsed: currentDailyUsed,
              getIdToken: (forceRefresh?: boolean) => firebaseUser.getIdToken(forceRefresh)
            } as CurrentUser

            setUser(currentUserObj)
            saveCachedUser(currentUserObj)
          } else {
            const fallbackUser: CurrentUser = {
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
            }
            setUser(fallbackUser)
            saveCachedUser(fallbackUser)
          }
          setLoading(false)
        },
        (error) => {
          console.error('Error fetching user data:', error)
          setUser(null)
          saveCachedUser(null)
          setLoading(false)
        }
      )
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot()
      }
      if (expiryTimer) {
        clearTimeout(expiryTimer)
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
