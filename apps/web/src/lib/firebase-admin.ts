// apps/web/src/lib/firebase-admin.ts
// Server-side only — do NOT import in client components
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

function initAdminApp() {
  if (getApps().length > 0) return getApp()

  const serviceAccountRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_ADMIN_SDK_KEY

  if (serviceAccountRaw) {
    let credential: object
    try {
      credential = JSON.parse(serviceAccountRaw)
    } catch {
      credential = JSON.parse(
        Buffer.from(serviceAccountRaw, 'base64').toString('utf-8')
      )
    }
    return initializeApp({
      credential: cert(credential as Parameters<typeof cert>[0]),
    })
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    })
  }

  throw new Error(
    '[firebase-admin] Aucune credential trouvée. ' +
    'Définissez FIREBASE_SERVICE_ACCOUNT_KEY ou ' +
    'FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY dans .env.local'
  )
}

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_, prop) {
    initAdminApp()
    return Reflect.get(getFirestore(), prop)
  }
})

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_, prop) {
    initAdminApp()
    return Reflect.get(getAuth(), prop)
  }
})