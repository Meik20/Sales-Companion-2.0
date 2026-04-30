'use client'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { auth, firestore } from '@/services/firebase/client'

type RegisterInput = {
  email: string
  password: string
  name: string
  role: string
}

export function useAuthActions() {
  const registerWithEmail = async (input: RegisterInput) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, input.email, input.password)
      await updateProfile(user, { displayName: input.name })
      
      // Save user profile data to Firestore
      await setDoc(doc(firestore, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: input.name,
        name: input.name,
        role: input.role || 'independent',
        plan: 'free',
        dailyLimit: 10,
        dailyUsed: 0,
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastLogin: Timestamp.now(),
        photoURL: user.photoURL || null,
        companyId: null,
        managerUid: null,
        preferences: {
          darkMode: false,
          emailNotifications: true,
          language: 'fr',
        },
      }, { merge: false })
      
      return user
    } catch (error) {
      throw error
    }
  }

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      
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
