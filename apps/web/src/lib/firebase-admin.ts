// apps/web/src/lib/firebase-admin.ts
// Server-side only — do NOT import in client components

import * as admin from 'firebase-admin'

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  // Support both a base64-encoded JSON service account key and plain JSON
  const serviceAccountRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_ADMIN_SDK_KEY

  if (serviceAccountRaw) {
    let credential: admin.ServiceAccount
    try {
      // Try plain JSON first
      credential = JSON.parse(serviceAccountRaw)
    } catch {
      // Fallback: base64-encoded JSON
      credential = JSON.parse(
        Buffer.from(serviceAccountRaw, 'base64').toString('utf-8')
      )
    }
    return admin.initializeApp({
      credential: admin.credential.cert(credential),
      projectId,
    })
  }

  // Fallback: Application Default Credentials (works in Cloud Run / GCP)
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  })
}

export const adminApp = getAdminApp()
export const adminDb = admin.firestore(adminApp)
export const adminAuth = admin.auth(adminApp)
