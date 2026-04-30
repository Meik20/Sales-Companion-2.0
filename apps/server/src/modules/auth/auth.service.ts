import { adminAuth, adminDb } from '../../firebase/admin'

export const authService = {
  async login(idToken: string) {
    const decoded = await adminAuth.verifyIdToken(idToken)
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get()

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      claimsRole: typeof decoded.role === 'string' ? decoded.role : null,
      profile: userDoc.exists ? userDoc.data() : null
    }
  }
}