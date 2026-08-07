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
  const today = new Date().toISOString().slice(0, 10) // e.g. "2026-05-06"
  const lastReset = userData.lastResetDate
  const plan = userData.plan || 'free'

  if (plan === 'free') {
    const currentMonth = today.slice(0, 7) // e.g. "2026-05"
    const lastResetMonth = lastReset ? lastReset.slice(0, 7) : ''

    if (lastResetMonth !== currentMonth) {
      await userRef.update({
        dailyUsed: 0,
        lastResetDate: today
      })
      return 0
    }
  } else {
    if (lastReset !== today) {
      await userRef.update({
        dailyUsed: 0,
        lastResetDate: today
      })
      return 0
    }
  }

  return userData.dailyUsed ?? 0
}
