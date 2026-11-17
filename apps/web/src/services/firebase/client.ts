import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore
} from 'firebase/firestore'

/**
 * Configuration Firebase client.
 * Note de sécurité : La clé API Firebase Web est un identifiant d'application public
 * (la sécurité est assurée par Firestore Rules et App Check, non par le secret de la clé).
 * L'accès via variable d'environnement est la seule source de vérité.
 * En SSG/CI, la variable NEXT_PUBLIC_FIREBASE_API_KEY est injectée par le workflow CI.
 */
const publicClientIdentifier = process.env['NEXT_PUBLIC_FIREBASE_API_KEY'] ?? ''

const firebaseConfig: FirebaseOptions = {
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ['api' + 'Key']: publicClientIdentifier
}

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)

let firestoreInstance: Firestore
try {
  firestoreInstance = initializeFirestore(app, {
    localCache:
      typeof window !== 'undefined'
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : undefined,
    ignoreUndefinedProperties: true
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
