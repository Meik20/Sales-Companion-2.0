'use client'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { auth, firestore } from '@/services/firebase/client'

type RegisterInput = {
  email: string
  password: string
  name: string
  role: string
  companyName?: string
  sector?: string
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

      // ✅ FORCE TOKEN REFRESH to get custom claims
      await user.getIdToken(true)

      // Send email verification link
      try {
        const actionCodeSettings = {
          url: typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:3000/login',
          handleCodeInApp: false
        }
        await sendEmailVerification(user, actionCodeSettings)
      } catch (emailErr) {
        console.error('Initial email verification send failed:', emailErr)
        // Non-blocking: we still want registration to succeed because the Firebase user was created successfully
      }

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

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      throw error
    }
  }

  return { registerWithEmail, loginWithEmail, logout }
}
