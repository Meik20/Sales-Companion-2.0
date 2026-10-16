/**
 * sync-team-plan.ts
 * -----------------
 * Utilitaire serveur : synchronise le plan ET la période de validité de tous
 * les comptes associés d'un manager (membres d'équipe, agents support, et Team Managers de l'organisation).
 *
 * RÈGLE MÉTIER (AGENTS.md) :
 *  - Si le manager est Senior Manager (ou possède un orgCode) :
 *    1. Le document `organisations/{orgCode}` est synchronisé avec le plan et sa validité.
 *    2. Tous les Team Managers de l'organisation (role === 'manager', orgRole === 'team_manager')
 *       reçoivent le plan et la période de validité en temps réel.
 *    3. Tous les membres commerciaux (role === 'member') rattachés à n'importe quel TM ou au SM
 *       reçoivent le plan, le quota quotidien et la période de validité.
 *    4. Tous les agents support (role === 'support_agent') reçoivent le plan et la validité tout en gardant l'illimité.
 *    5. Tous les `team_accesses` de l'organisation sont synchronisés.
 *  - Si le manager est un manager isolé (sans organisation globale) :
 *    Met à jour ses membres directs et ses team_accesses.
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
  updatedOrgs: number
  errors: string[]
}

/**
 * Propage le plan et la période de validité du manager à tous ses comptes associés
 * et en cascade à toute son organisation le cas échéant.
 *
 * @param managerUid  UID Firebase du manager
 * @param newPlan     Nouveau plan à appliquer ('starter' | 'pro' | 'enterprise' | 'free')
 * @param options     Période de validité et options d'expiration
 */
export async function syncTeamMemberPlans(
  managerUid: string,
  newPlan: UserPlan,
  options?: SyncOptions
): Promise<SyncResult> {
  const result: SyncResult = { updatedUsers: 0, updatedAccesses: 0, updatedOrgs: 0, errors: [] }
  const newDailyLimit = PLAN_LIMITS[newPlan] ?? 10

  // ── 0. Récupérer le document du manager ─────────────────────────────────────
  let subscriptionExpiresAt = options?.subscriptionExpiresAt
  let subscriptionStartedAt = options?.subscriptionStartedAt
  let subscriptionExpired = options?.subscriptionExpired
  let orgCode: string | null = null
  let isSeniorManager = false

  try {
    const managerSnap = await adminDb.collection('users').doc(managerUid).get()
    if (managerSnap.exists) {
      const mData = managerSnap.data()
      if (subscriptionExpiresAt === undefined) {
        subscriptionExpiresAt = mData?.subscriptionExpiresAt ?? mData?.planExpiresAt ?? null
      }
      if (subscriptionStartedAt === undefined) {
        subscriptionStartedAt = mData?.subscriptionStartedAt ?? null
      }
      if (subscriptionExpired === undefined) {
        subscriptionExpired = mData?.subscriptionExpired ?? false
      }
      orgCode = mData?.orgCode || null
      isSeniorManager = mData?.orgRole === 'senior_manager' || (Boolean(orgCode) && !mData?.seniorManagerUid)
    }
  } catch (err) {
    console.warn(`[syncTeamMemberPlans] Impossible de lire le manager ${managerUid}:`, err)
  }

  // ── 1. Mettre à jour le document d'organisation si applicable ───────────────
  if (orgCode && isSeniorManager) {
    try {
      const orgRef = adminDb.collection('organisations').doc(orgCode)
      await orgRef.set(
        {
          plan: newPlan,
          subscriptionExpiresAt: subscriptionExpiresAt ?? null,
          subscriptionStartedAt: subscriptionStartedAt ?? null,
          subscriptionExpired: subscriptionExpired ?? false,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      )
      result.updatedOrgs += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[syncTeamMemberPlans] organisation update error:', msg)
      result.errors.push(`organisation: ${msg}`)
    }
  }

  // ── 2. Collecter tous les documents utilisateurs à mettre à jour ────────────
  const userDocsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
  const managerUidsSet = new Set<string>([managerUid])

  try {
    // A. Membres directs du manager
    const usersByUidSnap = await adminDb
      .collection('users')
      .where('managerUid', '==', managerUid)
      .get()
    usersByUidSnap.docs.forEach((d) => userDocsMap.set(d.id, d))

    const usersByIdSnap = await adminDb
      .collection('users')
      .where('managerId', '==', managerUid)
      .get()
    usersByIdSnap.docs.forEach((d) => userDocsMap.set(d.id, d))

    // B. Si Senior Manager d'une organisation, cascade sur tous les TM et leurs membres
    if (orgCode && isSeniorManager) {
      // 1. Tous les Team Managers de l'organisation
      const orgManagersSnap = await adminDb
        .collection('users')
        .where('orgCode', '==', orgCode)
        .where('role', '==', 'manager')
        .get()

      orgManagersSnap.docs.forEach((doc) => {
        if (doc.id !== managerUid) {
          userDocsMap.set(doc.id, doc)
          managerUidsSet.add(doc.id)
        }
      })

      // 2. Tous les utilisateurs membres ou support_agents avec cet orgCode
      const orgMembersSnap = await adminDb
        .collection('users')
        .where('orgCode', '==', orgCode)
        .get()

      orgMembersSnap.docs.forEach((doc) => {
        if (doc.id !== managerUid) {
          userDocsMap.set(doc.id, doc)
        }
      })

      // 3. Les membres rattachés aux TM dont le doc n'aurait pas le orgCode dénormalisé
      for (const tmUid of managerUidsSet) {
        if (tmUid === managerUid) continue
        const tmSubordinatesSnap = await adminDb
          .collection('users')
          .where('managerUid', '==', tmUid)
          .get()
        tmSubordinatesSnap.docs.forEach((doc) => userDocsMap.set(doc.id, doc))
      }
    }

    // C. Application du lot de mise à jour des users
    if (userDocsMap.size > 0) {
      const CHUNK_SIZE = 400
      const entries = Array.from(userDocsMap.values())

      for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = entries.slice(i, i + CHUNK_SIZE)
        const batch = adminDb.batch()

        chunk.forEach((doc) => {
          const data = doc.data()
          const isSupport = data.role === 'support_agent'
          const isManagerDoc = data.role === 'manager'

          const updatePayload: Record<string, unknown> = {
            plan: newPlan,
            subscriptionExpiresAt: subscriptionExpiresAt ?? null,
            subscriptionStartedAt: subscriptionStartedAt ?? null,
            subscriptionExpired: subscriptionExpired ?? false,
            updatedAt: FieldValue.serverTimestamp()
          }

          // Ajuster le quota sauf pour les agents support qui restent illimités
          if (!isSupport) {
            updatePayload.dailyLimit = newDailyLimit
          }

          batch.update(doc.ref, updatePayload)
        })

        await batch.commit()
      }
      result.updatedUsers = userDocsMap.size
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[syncTeamMemberPlans] users batch error:', msg)
    result.errors.push(`users: ${msg}`)
  }

  // ── 3. Mettre à jour tous les team_accesses associés ─────────────────────────
  try {
    const accessDocsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()

    // Accesses par managerUid pour tous les managers concernés
    for (const mUid of managerUidsSet) {
      const accessesSnap = await adminDb
        .collection('team_accesses')
        .where('managerUid', '==', mUid)
        .get()
      accessesSnap.docs.forEach((doc) => accessDocsMap.set(doc.id, doc))
    }

    // Si orgCode, chercher aussi par orgCode dans team_accesses
    if (orgCode) {
      const orgAccessesSnap = await adminDb
        .collection('team_accesses')
        .where('orgCode', '==', orgCode)
        .get()
      orgAccessesSnap.docs.forEach((doc) => accessDocsMap.set(doc.id, doc))
    }

    if (accessDocsMap.size > 0) {
      const CHUNK_SIZE = 400
      const accesses = Array.from(accessDocsMap.values())

      for (let i = 0; i < accesses.length; i += CHUNK_SIZE) {
        const chunk = accesses.slice(i, i + CHUNK_SIZE)
        const batch = adminDb.batch()

        chunk.forEach((doc) => {
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

          batch.update(doc.ref, accessPayload)
        })

        await batch.commit()
      }
      result.updatedAccesses = accessDocsMap.size
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[syncTeamMemberPlans] accesses batch error:', msg)
    result.errors.push(`accesses: ${msg}`)
  }

  console.log(
    `[syncTeamMemberPlans] ✅ manager=${managerUid} org=${orgCode || 'none'} plan=${newPlan}` +
      ` → ${result.updatedUsers} users, ${result.updatedAccesses} accesses, ${result.updatedOrgs} orgs synchronisés`
  )

  return result
}
