// apps/web/src/lib/firebase-admin.ts
// Server-side only — do NOT import in client components

import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

function initAdminApp() {
  if (getApps().length > 0) {
    return getApp()
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  // Support both a base64-encoded JSON service account key and plain JSON
  const serviceAccountRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_ADMIN_SDK_KEY

  if (serviceAccountRaw) {
    let credential: object
    try {
      // Try plain JSON first
      credential = JSON.parse(serviceAccountRaw)
    } catch {
      // Fallback: base64-encoded JSON
      credential = JSON.parse(
        Buffer.from(serviceAccountRaw, 'base64').toString('utf-8')
      )
    }
    return initializeApp({
      credential: cert(credential as Parameters<typeof cert>[0]),
      projectId,
    })
  }

  // Fallback: Application Default Credentials (works in Cloud Run / GCP)
  return initializeApp({
    credential: applicationDefault(),
    projectId,
  })
}

initAdminApp()

export const adminDb = getFirestore()
export const adminAuth = getAuth()
