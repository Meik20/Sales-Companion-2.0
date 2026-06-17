'use client'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail
} from 'firebase/auth'
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { auth, firestore, googleProvider } from '@/services/firebase/client'

type RegisterInput = {
  email: string
  password: string
  name: string
  role: string
  companyName?: string
  sector?: string
}

/** Upsert the Firestore user document after any Google sign-in */
async function upsertGoogleUser(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }) {
  const ref = doc(firestore, 'users', user.uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    // First-time Google sign-in → create full profile
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      name: user.displayName || '',
      role: 'independent',
      plan: 'free',
      dailyLimit: 10,
      dailyUsed: 0,
      active: true,
      activated: true,
      emailVerificationPending: false,
      provider: 'google',
      photoURL: user.photoURL || null,
      companyId: null,
      managerUid: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLogin: Timestamp.now(),
      preferences: {
        darkMode: false,
        emailNotifications: true,
        language: 'fr'
      }
    })
  } else {
    // Returning user → only update lastLogin & photoURL
    await setDoc(
      ref,
      { lastLogin: Timestamp.now(), photoURL: user.photoURL || null },
      { merge: true }
    )
  }
}

export function useAuthActions() {
  const registerWithEmail = async (input: RegisterInput) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, input.email, input.password)
      await updateProfile(user, { displayName: input.name })

      // Save user profile data to Firestore
      await setDoc(
        doc(firestore, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email,
          displayName: input.name,
          name: input.name,
          role: input.role || 'independent',
          sector: input.sector || null,
          plan: 'free',
          dailyLimit: 10,
          dailyUsed: 0,
          active: false,
          activated: false,
          emailVerificationPending: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastLogin: Timestamp.now(),
          photoURL: user.photoURL || null,
          companyName: input.companyName || null,
          companyId: null,
          managerUid: null,
          preferences: {
            darkMode: false,
            emailNotifications: true,
            language: 'fr'
          }
        },
        { merge: false }
      )

      // Send email verification link via our backend
      try {
        const token = await user.getIdToken()
        await fetch('/api/auth/send-verification', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (emailErr) {
        console.error('Initial email verification send failed:', emailErr)
      }

      // ✅ FORCE TOKEN REFRESH to get custom claims
      await user.getIdToken(true)

      return user
    } catch (error) {
      throw error
    }
  }

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password)

      // ✅ FORCE TOKEN REFRESH to get custom claims
      await user.getIdToken(true)

      // Update lastLogin timestamp
      await setDoc(
        doc(firestore, 'users', user.uid),
        { lastLogin: Timestamp.now() },
        { merge: true }
      )

      return user
    } catch (error) {
      throw error
    }
  }

  /**
   * Google Sign-In — popup first, redirect fallback if popup is blocked.
   *
   * Returns the Firebase user on popup success.
   * Returns null when a redirect has been initiated (page will reload).
   */
  const loginWithGoogle = async (): Promise<{ uid: string } | null> => {
    try {
      // Attempt popup first (best UX)
      const result = await signInWithPopup(auth, googleProvider)
      const { user } = result
      await upsertGoogleUser(user)
      await user.getIdToken(true)
      return user
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''

      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        // Popup was blocked by the browser → fall back to redirect
        await signInWithRedirect(auth, googleProvider)
        return null // page will reload; result handled by useGoogleRedirectResult
      }

      throw err
    }
  }

  const sendPasswordReset = async (email: string) => {
    try {
      const actionCodeSettings = {
        url: typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:3000/login',
        handleCodeInApp: false
      }
      await sendPasswordResetEmail(auth, email, actionCodeSettings)
    } catch (error) {
      throw error
    }
  }

  const updateUserEmail = async (newEmail: string) => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error("Aucun utilisateur connecté")
      const actionCodeSettings = {
        url: typeof window !== 'undefined' ? `${window.location.origin}/settings` : 'http://localhost:3000/settings',
        handleCodeInApp: false
      }
      await verifyBeforeUpdateEmail(currentUser, newEmail, actionCodeSettings)
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      throw error
    }
  }

  return {
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    sendPasswordReset,
    updateUserEmail,
    logout
  }
}

/**
 * Call once at the top of login/register pages to pick up the Google
 * redirect result after the page reloads from signInWithRedirect.
 * Returns the user if a redirect just completed, otherwise null.
 */
export async function resolveGoogleRedirect() {
  try {
    const result = await getRedirectResult(auth)
    if (result?.user) {
      await upsertGoogleUser(result.user)
      await result.user.getIdToken(true)
      return result.user
    }
    return null
  } catch {
    return null
  }
}
