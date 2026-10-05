/**
 * sync-team-plan.ts
 * -----------------
 * Utilitaire serveur : synchronise le plan ET la période de validité de tous
 * les comptes associés d'un manager (membres d'équipe et agents support).
 *
 * RÈGLE MÉTIER :
 *  - Les membres commerciaux (role === 'member') reçoivent le plan, le quota quotidien
 *    et la période de validité (subscriptionExpiresAt) de l'abonnement du manager.
 *  - Les agents support (role === 'support_agent') reçoivent également le plan de l'organisation
 *    et la période de validité (subscriptionExpiresAt), tout en conservant leur statut illimité.
 *  - Mise à jour dans `users` ET dans `team_accesses` pour une parfaite cohérence.
 */

import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { PLAN_LIMITS } from '@sales-companion/shared'
import type { UserPlan } from '@sales-companion/shared'

export interface SyncOptions {
  subscriptionExpiresAt?: string | null
  subscriptionStartedAt?: string | null
  subscriptionExpired?: boolean
}

export interface SyncResult {
  updatedUsers: number
  updatedAccesses: number
  errors: string[]
}

/**
 * Propage le plan et la période de validité du manager à tous ses comptes associés
 * (membres d'équipe et agents support).
 *
 * @param managerUid  UID Firebase du manager
 * @param newPlan     Nouveau plan à appliquer ('starter' | 'pro' | 'enterprise' | 'free')
 * @param options     Période de validité et options d'expiration (si omises, lues depuis le document manager)
 * @returns Résumé de la synchronisation
 */
export async function syncTeamMemberPlans(
  managerUid: string,
  newPlan: UserPlan,
  options?: SyncOptions
): Promise<SyncResult> {
  const result: SyncResult = { updatedUsers: 0, updatedAccesses: 0, errors: [] }
  const newDailyLimit = PLAN_LIMITS[newPlan] ?? 10

  // ── 0. Récupérer la date de validité depuis le manager si non fournie ─────────
  let subscriptionExpiresAt = options?.subscriptionExpiresAt
  let subscriptionStartedAt = options?.subscriptionStartedAt
  let subscriptionExpired = options?.subscriptionExpired

  if (subscriptionExpiresAt === undefined) {
    try {
      const managerSnap = await adminDb.collection('users').doc(managerUid).get()
      if (managerSnap.exists) {
        const mData = managerSnap.data()
        subscriptionExpiresAt = mData?.subscriptionExpiresAt ?? mData?.planExpiresAt ?? null
        subscriptionStartedAt = mData?.subscriptionStartedAt ?? null
        subscriptionExpired = mData?.subscriptionExpired ?? false
      }
    } catch (err) {
      console.warn(`[syncTeamMemberPlans] Impossible de lire le manager ${managerUid}:`, err)
    }
  }

  // ── 1. Mettre à jour tous les users associés au manager (members et support_agents) ──
  try {
    // Requête principale par managerUid
    const usersByUidSnap = await adminDb
      .collection('users')
      .where('managerUid', '==', managerUid)
      .get()

    // Requête de secours par managerId (pour compatibilité ancienne structure)
    const usersByIdSnap = await adminDb
      .collection('users')
      .where('managerId', '==', managerUid)
      .get()

    // Fusionner les documents uniques
    const userDocsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
    usersByUidSnap.docs.forEach((doc) => userDocsMap.set(doc.id, doc))
    usersByIdSnap.docs.forEach((doc) => userDocsMap.set(doc.id, doc))

    if (userDocsMap.size > 0) {
      const usersBatch = adminDb.batch()
      userDocsMap.forEach((doc) => {
        const data = doc.data()
        const isSupport = data.role === 'support_agent'

        const updatePayload: Record<string, unknown> = {
          plan: newPlan,
          subscriptionExpiresAt: subscriptionExpiresAt ?? null,
          subscriptionStartedAt: subscriptionStartedAt ?? null,
          subscriptionExpired: subscriptionExpired ?? false,
          updatedAt: FieldValue.serverTimestamp()
        }

        // Pour les membres classiques, ajuster aussi le quota quotidien
        if (!isSupport) {
          updatePayload.dailyLimit = newDailyLimit
        }

        usersBatch.update(doc.ref, updatePayload)
      })

      await usersBatch.commit()
      result.updatedUsers = userDocsMap.size
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[syncTeamMemberPlans] users batch error:', msg)
    result.errors.push(`users: ${msg}`)
  }

  // ── 2. Mettre à jour les team_accesses correspondants ───────────────────────
  try {
    const accessesSnap = await adminDb
      .collection('team_accesses')
      .where('managerUid', '==', managerUid)
      .get()

    if (!accessesSnap.empty) {
      const accessesBatch = adminDb.batch()
      accessesSnap.docs.forEach((doc) => {
        const data = doc.data()
        const isSupport = data.role === 'support_agent'

        const accessPayload: Record<string, unknown> = {
          plan: newPlan,
          subscriptionExpiresAt: subscriptionExpiresAt ?? null,
          subscriptionStartedAt: subscriptionStartedAt ?? null,
          subscriptionExpired: subscriptionExpired ?? false,
          updatedAt: FieldValue.serverTimestamp()
        }

        if (!isSupport) {
          accessPayload.dailyLimit = newDailyLimit
        }

        accessesBatch.update(doc.ref, accessPayload)
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
    `[syncTeamMemberPlans] ✅ manager=${managerUid} plan=${newPlan} validité=${subscriptionExpiresAt}` +
      ` → ${result.updatedUsers} users, ${result.updatedAccesses} accesses synchronisés`
  )

  return result
}
