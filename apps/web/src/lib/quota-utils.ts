import { adminDb } from './firebase-admin'
import { DocumentReference } from 'firebase-admin/firestore'

/**
 * Checks if the user's daily quota needs a reset (Lazy Reset logic).
 * If today's date is different from the lastResetDate stored in Firestore,
 * we reset dailyUsed to 0 and update lastResetDate.
 *
 * @returns The current dailyUsed count after potential reset.
 */
export async function ensureDailyReset(userRef: DocumentReference, userData: any): Promise<number> {
  const today = new Date().toISOString().split('T')[0] // e.g. "2026-05-06"
  const lastReset = userData.lastResetDate

  if (lastReset !== today) {
    await userRef.update({
      dailyUsed: 0,
      lastResetDate: today
    })
    return 0
  }

  return userData.dailyUsed ?? 0
}
