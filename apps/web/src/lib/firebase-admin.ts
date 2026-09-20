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
    let cleanRaw = serviceAccountRaw.trim()
    if (
      (cleanRaw.startsWith("'") && cleanRaw.endsWith("'")) ||
      (cleanRaw.startsWith('"') && cleanRaw.endsWith('"'))
    ) {
      cleanRaw = cleanRaw.slice(1, -1).trim()
    }

    let credential: object | null = null
    try {
      credential = JSON.parse(cleanRaw)
    } catch {
      try {
        credential = JSON.parse(
          Buffer.from(cleanRaw, 'base64').toString('utf-8')
        )
      } catch (err) {
        console.warn('[firebase-admin] Échec du parsing de FIREBASE_SERVICE_ACCOUNT_KEY, tentative avec les variables individuelles...', err)
      }
    }

    if (credential) {
      try {
        return initializeApp({
          credential: cert(credential as Parameters<typeof cert>[0]),
        })
      } catch (err) {
        console.warn('[firebase-admin] Échec initializeApp avec FIREBASE_SERVICE_ACCOUNT_KEY, tentative avec variables individuelles...', err)
      }
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (privateKey) {
    privateKey = privateKey.trim()
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1).replace(/\\n/g, '\n')
    }
  }

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    })
  }

  throw new Error(
    '[firebase-admin] Aucune credential valide trouvée. ' +
    'Définissez FIREBASE_SERVICE_ACCOUNT_KEY ou ' +
    'FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY dans .env'
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