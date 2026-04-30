import { adminAuth, adminDb } from '../../firebase/admin'
import { statsService } from '../../services/stats.service'

type UpdateUserInput = {
  uid: string
  data: Record<string, unknown>
}

export const adminService = {
  async getStats() {
    return await statsService.getDashboardStats()
  },

  async setAdminClaim(uid: string) {
    await adminAuth.setCustomUserClaims(uid, { role: 'admin' })
    await adminDb.collection('users').doc(uid).set(
      {
        role: 'admin'
      },
      { merge: true }
    )

    return { uid, role: 'admin' }
  },

  async listUsers() {
    const snapshot = await adminDb.collection('users').limit(200).get()
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
  },

  async updateUser(input: UpdateUserInput) {
    await adminDb.collection('users').doc(input.uid).set(input.data, { merge: true })
    return { uid: input.uid, updated: true }
  },

  async deleteUser(uid: string) {
    await adminDb.collection('users').doc(uid).delete()
    return { uid, deleted: true }
  }
}