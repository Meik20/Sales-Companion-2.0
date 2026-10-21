/**
 * monthly-cycle-archive.service.ts
 * Service serveur d'archivage automatique des opportunités conclues (J+3).
 */

import type { Firestore } from 'firebase-admin/firestore'
import { syncPipelineItemToClient } from '../../lib/clients-sync'
import { isEligibleForAutoArchive } from '../../lib/monthly-cycle'

/**
 * Exécute la purge et l'archivage automatique des opportunités conclues éligibles (J+3 dépassé).
 * Cette fonction est idempotente et sûre à appeler soit par CRON, soit en arrière-plan
 * lors des requêtes pipeline/reporting.
 */
export async function runMonthlyPipelineCycleAutoArchive(
  adminDb: Firestore,
  filterManagerUid?: string,
  limitPerStatus: number = 300
): Promise<{ archivedCount: number; hasMore: boolean }> {
  try {
    const now = new Date()

    let q1: FirebaseFirestore.Query = adminDb.collection('pipeline').where('status', '==', 'conclue')
    let q2: FirebaseFirestore.Query = adminDb.collection('pipeline').where('status', '==', 'conclusion')

    if (filterManagerUid) {
      q1 = q1.where('managerUid', '==', filterManagerUid)
      q2 = q2.where('managerUid', '==', filterManagerUid)
    }

    const [snap1, snap2] = await Promise.all([q1.limit(limitPerStatus).get(), q2.limit(limitPerStatus).get()])
    const hasMore = snap1.docs.length >= limitPerStatus || snap2.docs.length >= limitPerStatus
    const seenIds = new Set<string>()
    const docs: FirebaseFirestore.DocumentSnapshot[] = []
    for (const d of [...snap1.docs, ...snap2.docs]) {
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id)
        docs.push(d)
      }
    }

    let archivedCount = 0

    for (const doc of docs) {
      const data = doc.data() || {}
      let concludedDate: Date | null = null

      if (data.concludedAt) {
        concludedDate = data.concludedAt.toDate ? data.concludedAt.toDate() : new Date(data.concludedAt)
      } else if (data.updatedAt) {
        concludedDate = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
      } else if (data.createdAt) {
        concludedDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      }

      if (concludedDate && !isNaN(concludedDate.getTime()) && isEligibleForAutoArchive(concludedDate, now)) {
        await syncPipelineItemToClient(adminDb, doc.id, {
          ...data,
          concludedAt: data.concludedAt || concludedDate
        })
        await doc.ref.delete()
        archivedCount++
      }
    }

    return { archivedCount, hasMore }
  } catch (err) {
    console.error('[runMonthlyPipelineCycleAutoArchive] error:', err)
    throw err
  }
}
