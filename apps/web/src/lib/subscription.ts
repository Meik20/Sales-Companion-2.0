/**
 * subscription.ts
 * ---------------
 * Gestion et cycle de vie des abonnements payants.
 *
 * RÈGLES MÉTIER :
 * 1. Tout abonnement payant est calculé pour 30 jours et expire le 30ème jour à minuit (23:59:59.999).
 * 2. Si un utilisateur n'a pas renouvelé à l'échéance, il bascule automatiquement vers le plan "free".
 * 3. Lors d'un passage à "free", toutes les fonctionnalités payantes sont instantanément révoquées.
 * 4. Si l'utilisateur est un manager, ses membres d'équipe sont également rétrogradés vers "free".
 */

import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { PLAN_LIMITS } from '@sales-companion/shared'
import { syncTeamMemberPlans } from '@/lib/sync-team-plan'

/**
 * Calcule la date d'expiration d'un abonnement de 30 jours se terminant à minuit (23:59:59.999).
 *
 * @param startDate Date de souscription (par défaut maintenant)
 * @returns Date d'échéance le 30ème jour à minuit
 */
export function calculateSubscriptionExpiry(startDate: Date = new Date()): Date {
  const expiry = new Date(startDate)
  expiry.setDate(expiry.getDate() + 30)
  expiry.setHours(23, 59, 59, 999)
  return expiry
}

/**
 * Vérifie si une date d'expiration d'abonnement est dépassée.
 */
export function isSubscriptionExpired(subscriptionExpiresAt?: string | Date | null): boolean {
  if (!subscriptionExpiresAt) return false
  const expiryTime = new Date(subscriptionExpiresAt).getTime()
  if (isNaN(expiryTime)) return false
  return Date.now() >= expiryTime
}

/**
 * Rétrograde un utilisateur vers le plan "free" avec réinitialisation des quotas
 * et propagation à son équipe s'il est manager.
 *
 * @param uid UID de l'utilisateur
 * @param reason Raison de la rétrogradation (expiration, annulation, admin)
 */
export async function downgradeUserToFree(
  uid: string,
  reason: 'expired' | 'admin' | 'manual' = 'expired'
): Promise<boolean> {
  try {
    const userRef = adminDb.collection('users').doc(uid)
    const userSnap = await userRef.get()
    if (!userSnap.exists) return false

    const userData = userSnap.data()!
    const oldPlan = userData.plan ?? 'free'

    // Si déjà free, rien à faire
    if (oldPlan === 'free') {
      return true
    }

    const freeDailyLimit = PLAN_LIMITS.free ?? 10

    await userRef.update({
      plan: 'free',
      dailyLimit: freeDailyLimit,
      subscriptionExpired: true,
      subscriptionExpiredAt: FieldValue.serverTimestamp(),
      subscriptionDowngradeReason: reason,
      previousPlan: oldPlan,
      updatedAt: FieldValue.serverTimestamp()
    })

    console.log(`[subscription] ⚠️ Utilisateur ${uid} rétrogradé vers "free" (ancien plan: ${oldPlan}, raison: ${reason})`)

    // Si c'est un manager, rétrograder aussi ses membres d'équipe vers "free"
    if (userData.role === 'manager') {
      try {
        const syncRes = await syncTeamMemberPlans(uid, 'free', {
          subscriptionExpiresAt: null,
          subscriptionExpired: true
        })
        console.log(`[subscription] 👥 Équipe synchronisée vers free pour manager ${uid} (${syncRes.updatedUsers} membres)`)
      } catch (syncErr) {
        console.error(`[subscription] Erreur sync équipe lors de la rétrogradation:`, syncErr)
      }
    }

    // Journal d'activité dans Firestore pour traçabilité
    try {
      await adminDb.collection('subscription_logs').add({
        userId: uid,
        userEmail: userData.email ?? null,
        userRole: userData.role ?? 'independent',
        oldPlan,
        newPlan: 'free',
        action: 'downgrade',
        reason,
        timestamp: FieldValue.serverTimestamp()
      })
    } catch {
      // Ignorer l'erreur d'audit log
    }

    return true
  } catch (err) {
    console.error(`[subscription] Échec de la rétrogradation pour ${uid}:`, err)
    return false
  }
}

/**
 * Vérifie l'expiration de l'abonnement d'un utilisateur spécifique.
 * Si la date d'échéance est dépassée et que l'utilisateur est payant, il est rétrogradé.
 */
export async function checkAndExpireUser(
  uid: string
): Promise<{ expired: boolean; plan: string; expiresAt?: string | null }> {
  const userRef = adminDb.collection('users').doc(uid)
  const snap = await userRef.get()
  if (!snap.exists) return { expired: false, plan: 'free' }

  const data = snap.data()!
  const currentPlan = data.plan ?? 'free'
  const expiresAt = data.subscriptionExpiresAt ?? data.planExpiresAt ?? null

  if (currentPlan !== 'free' && expiresAt && isSubscriptionExpired(expiresAt)) {
    await downgradeUserToFree(uid, 'expired')
    return { expired: true, plan: 'free', expiresAt }
  }

  return { expired: false, plan: currentPlan, expiresAt }
}

/**
 * Tâche globale de tracking et vérification de tous les abonnements payants.
 * Conçue pour être invoquée par une tâche planifiée (Cron) ou à la demande.
 */
export async function checkAllExpiredSubscriptions(): Promise<{
  checked: number
  expiredCount: number
  expiredUids: string[]
}> {
  const expiredUids: string[] = []
  let checked = 0

  try {
    // Récupérer tous les utilisateurs avec un plan payant
    const paidUsersSnap = await adminDb
      .collection('users')
      .where('plan', 'in', ['starter', 'pro', 'enterprise'])
      .get()

    checked = paidUsersSnap.size

    for (const doc of paidUsersSnap.docs) {
      const data = doc.data()
      const expiresAt = data.subscriptionExpiresAt ?? data.planExpiresAt ?? null

      if (expiresAt && isSubscriptionExpired(expiresAt)) {
        const success = await downgradeUserToFree(doc.id, 'expired')
        if (success) {
          expiredUids.push(doc.id)
        }
      }
    }

    console.log(
      `[subscription/cron] 🕒 Vérification globale terminée : ${checked} comptes payants vérifiés, ${expiredUids.length} expirés et rétrogradés.`
    )
  } catch (err) {
    console.error(`[subscription/cron] Erreur lors de la vérification globale des abonnements:`, err)
  }

  return {
    checked,
    expiredCount: expiredUids.length,
    expiredUids
  }
}
