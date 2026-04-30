import admin from 'firebase-admin'
import { env } from '../config/env'

const app = admin.apps.length
  ? admin.app()
  : admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    })

export const adminApp = app
export const adminAuth = admin.auth(app)
export const adminDb = admin.firestore(app)
export { admin }