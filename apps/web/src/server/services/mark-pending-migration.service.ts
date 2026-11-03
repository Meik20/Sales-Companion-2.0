/**
 * mark-pending-migration.service.ts
 *
 * Service serveur de marquage des opportunités conclues en M-1 au 1er du nouveau mois.
 *
 * RÈGLE MÉTIER (AGENTS.md §6) :
 * Dès le 1er du mois M à 00:01, toutes les opportunités conclues au cours du mois M-1
 * reçoivent le marqueur `pendingMigration: true`. Ce marqueur signale qu'elles sont
 * en attente de migration vers la base clients (collection `clients`) lors de l'archivage
 * automatique au J+3 (3e jour du mois M à 23:59:59).
 *
 * Ce service est idempotent : il peut être appelé plusieurs fois sans effet de bord.
 */

import type { Firestore } from 'firebase-admin/firestore'
import { Timestamp } from 'firebase-admin/firestore'

export interface MarkPendingMigrationResult {
  markedCount: number
  alreadyMarkedCount: number
  skippedCount: number
  periodStart: string
  periodEnd: string
}

/**
 * Calcule les bornes de la période M-1 (1er jour du mois précédent → dernier jour du mois précédent).
 */
export function getPreviousMonthBounds(now: Date): { start: Date; end: Date } {
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  // 1er jour du mois précédent
  const start = new Date(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, 1, 0, 0, 0, 0)
  // Dernier instant du mois précédent (minuit moins 1 ms du 1er jour du mois courant)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return { start, end }
}

/**
 * Marque les opportunités conclues du mois M-1 avec `pendingMigration: true`.
 *
 * - Cible : collection `pipeline` où `status == 'conclue'` OU `status == 'conclusion'`
 *   ET `concludedAt` est dans les bornes du mois M-1.
 * - Les fiches sans `concludedAt` sont résolues via `updatedAt` ou `createdAt`.
 * - Idempotent : les fiches déjà marquées (`pendingMigration === true`) sont comptées
 *   dans `alreadyMarkedCount` et non réécrites.
 * - Rétroactif : inclut les fiches conclues en M-1 déjà présentes dans Firestore
 *   avant le déploiement de ce service.
 */
export async function markPendingMigrationDeals(
  adminDb: Firestore,
  now = new Date()
): Promise<MarkPendingMigrationResult> {
  const { start, end } = getPreviousMonthBounds(now)
  const startTs = Timestamp.fromDate(start)
  const endTs = Timestamp.fromDate(end)

  let markedCount = 0
  let alreadyMarkedCount = 0
  let skippedCount = 0

  const statuses = ['conclue', 'conclusion']
  const seenIds = new Set<string>()

  for (const status of statuses) {
    // 1. Requête optimisée via concludedAt (index composite attendu)
    let snap: FirebaseFirestore.QuerySnapshot
    try {
      snap = await adminDb
        .collection('pipeline')
        .where('status', '==', status)
        .where('concludedAt', '>=', startTs)
        .where('concludedAt', '<=', endTs)
        .get()
    } catch {
      // Repli sans index si les index composites ne sont pas encore disponibles
      snap = await adminDb.collection('pipeline').where('status', '==', status).get()
    }

    // 2. Passe de rattrapage pour les fiches sans concludedAt (résolues via updatedAt/createdAt)
    let fallbackSnap: FirebaseFirestore.QuerySnapshot | null = null
    try {
      fallbackSnap = await adminDb.collection('pipeline').where('status', '==', status).get()
    } catch {
      // Silencieux : la passe principale suffit si le fallback échoue
    }

    const allDocs: FirebaseFirestore.DocumentSnapshot[] = [...snap.docs]
    if (fallbackSnap) {
      for (const d of fallbackSnap.docs) {
        if (!seenIds.has(d.id) && !allDocs.find((x) => x.id === d.id)) {
          const data = d.data() || {}
          if (!data.concludedAt) {
            // Résoudre via updatedAt ou createdAt
            const effectiveDateRaw = data.updatedAt || data.createdAt
            if (effectiveDateRaw) {
              const effectiveDate: Date = effectiveDateRaw.toDate
                ? effectiveDateRaw.toDate()
                : new Date(effectiveDateRaw)
              if (
                !isNaN(effectiveDate.getTime()) &&
                effectiveDate >= start &&
                effectiveDate <= end
              ) {
                allDocs.push(d)
              }
            }
          }
        }
      }
    }

    // 3. Écriture par batch
    let batch = adminDb.batch()
    let batchOps = 0

    for (const doc of allDocs) {
      if (seenIds.has(doc.id)) continue
      seenIds.add(doc.id)

      const data = doc.data() || {}

      // Vérification finale de la date de conclusion dans la période M-1
      let concludedDateForCheck: Date | null = null
      if (data.concludedAt) {
        concludedDateForCheck = data.concludedAt.toDate
          ? data.concludedAt.toDate()
          : new Date(data.concludedAt)
      } else if (data.updatedAt) {
        concludedDateForCheck = data.updatedAt.toDate
          ? data.updatedAt.toDate()
          : new Date(data.updatedAt)
      } else if (data.createdAt) {
        concludedDateForCheck = data.createdAt.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt)
      }

      if (!concludedDateForCheck || isNaN(concludedDateForCheck.getTime())) {
        skippedCount++
        continue
      }

      if (concludedDateForCheck < start || concludedDateForCheck > end) {
        skippedCount++
        continue
      }

      // Idempotence : ne pas réécrire si déjà marqué
      if (data.pendingMigration === true) {
        alreadyMarkedCount++
        continue
      }

      batch.update(doc.ref, {
        pendingMigration: true,
        pendingMigrationAt: Timestamp.fromDate(now),
        pendingMigrationPeriod: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
      })
      markedCount++
      batchOps++

      if (batchOps >= 450) {
        await batch.commit()
        batch = adminDb.batch()
        batchOps = 0
      }
    }

    if (batchOps > 0) {
      await batch.commit()
    }
  }

  return {
    markedCount,
    alreadyMarkedCount,
    skippedCount,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString()
  }
}

