/**
 * sync-team-plan.ts
 * -----------------
 * Utilitaire serveur : synchronise le plan de tous les membres actifs
 * d'un manager avec le nouveau plan de ce dernier.
 *
 * RÈGLE MÉTIER :
 *  - Seuls les membres avec role === 'member' sont synchronisés.
 *  - Les agents support (role === 'support_agent') sont EXCLUS :
 *    ils ont un accès illimité et sans quota de recherche par design.
 *  - Mise à jour dans `users` ET dans `team_accesses` pour cohérence.
 */

import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { PLAN_LIMITS } from '@sales-companion/shared'
import type { UserPlan } from '@sales-companion/shared'

export interface SyncResult {
  updatedUsers: number
  updatedAccesses: number
  errors: string[]
}

/**
 * Propage le plan du manager à tous ses membres actifs (role=member).
 * Les support_agents sont intentionnellement exclus.
 *
 * @param managerUid  UID Firebase du manager
 * @param newPlan     Nouveau plan à appliquer ('starter' | 'pro' | 'enterprise')
 * @returns Résumé de la synchronisation
 */
export async function syncTeamMemberPlans(
  managerUid: string,
  newPlan: UserPlan
): Promise<SyncResult> {
  const result: SyncResult = { updatedUsers: 0, updatedAccesses: 0, errors: [] }
  const newDailyLimit = PLAN_LIMITS[newPlan] ?? 10

  // ── 1. Mettre à jour tous les users membres actifs du manager ──────────────
  try {
    const usersSnap = await adminDb
      .collection('users')
      .where('managerUid', '==', managerUid)
      .where('role', '==', 'member')
      .get()

    if (!usersSnap.empty) {
      const usersBatch = adminDb.batch()
      usersSnap.docs.forEach((doc) => {
        usersBatch.update(doc.ref, {
          plan: newPlan,
          dailyLimit: newDailyLimit,
          updatedAt: FieldValue.serverTimestamp()
        })
      })
      await usersBatch.commit()
      result.updatedUsers = usersSnap.size
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[syncTeamMemberPlans] users batch error:', msg)
    result.errors.push(`users: ${msg}`)
  }

  // ── 2. Mettre à jour les team_accesses correspondants (role=member uniquement) ──
  try {
    const accessesSnap = await adminDb
      .collection('team_accesses')
      .where('managerUid', '==', managerUid)
      .where('role', '==', 'member')
      .get()

    if (!accessesSnap.empty) {
      const accessesBatch = adminDb.batch()
      accessesSnap.docs.forEach((doc) => {
        accessesBatch.update(doc.ref, {
          plan: newPlan,
          dailyLimit: newDailyLimit,
          updatedAt: FieldValue.serverTimestamp()
        })
      })
      await accessesBatch.commit()
      result.updatedAccesses = accessesSnap.size
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[syncTeamMemberPlans] accesses batch error:', msg)
    result.errors.push(`accesses: ${msg}`)
  }

  console.log(
    `[syncTeamMemberPlans] ✅ manager=${managerUid} plan=${newPlan}` +
      ` → ${result.updatedUsers} users, ${result.updatedAccesses} accesses mis à jour`
  )

  return result
}
