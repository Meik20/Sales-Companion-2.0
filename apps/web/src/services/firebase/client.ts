import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:000000000000'
}


export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)

let firestoreInstance: Firestore
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: typeof window !== 'undefined'
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : undefined
  })
} catch {
  firestoreInstance = getFirestore(app)
}

export const firestore = firestoreInstance

// Google OAuth provider — scoped to profile + email
export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('profile')
googleProvider.addScope('email')
googleProvider.setCustomParameters({ prompt: 'select_account' })

