/**
 * monthly-cycle-archive.service.ts
 * Service serveur d'archivage automatique des opportunités conclues (J+3).
 */

import type { Firestore } from 'firebase-admin/firestore'
import { syncPipelineItemToClient } from '../../lib/clients-sync'
import { isEligibleForAutoArchive } from '../../lib/monthly-cycle'

export interface ArchiveCycleCursors {
  q1LastDoc?: FirebaseFirestore.DocumentSnapshot
  q2LastDoc?: FirebaseFirestore.DocumentSnapshot
}

/**
 * Exécute la purge et l'archivage automatique des opportunités conclues éligibles (J+3 dépassé).
 * Cette fonction est idempotente et sûre à appeler soit par CRON, soit en arrière-plan.
 * Elle supporte un curseur de pagination pour traverser l'ensemble de la collection sans bloquer
 * sur les opportunités non encore éligibles.
 */
export async function runMonthlyPipelineCycleAutoArchive(
  adminDb: Firestore,
  filterManagerUid?: string,
  limitPerStatus: number = 300,
  cursors?: ArchiveCycleCursors
): Promise<{ archivedCount: number; hasMore: boolean; nextCursors?: ArchiveCycleCursors }> {
  try {
    const now = new Date()

    let q1: FirebaseFirestore.Query = adminDb.collection('pipeline').where('status', '==', 'conclue')
    let q2: FirebaseFirestore.Query = adminDb.collection('pipeline').where('status', '==', 'conclusion')

    if (filterManagerUid) {
      q1 = q1.where('managerUid', '==', filterManagerUid)
      q2 = q2.where('managerUid', '==', filterManagerUid)
    }

    if (cursors?.q1LastDoc) {
      q1 = q1.startAfter(cursors.q1LastDoc)
    }
    if (cursors?.q2LastDoc) {
      q2 = q2.startAfter(cursors.q2LastDoc)
    }

    const [snap1, snap2] = await Promise.all([q1.limit(limitPerStatus).get(), q2.limit(limitPerStatus).get()])
    const hasMore = snap1.docs.length >= limitPerStatus || snap2.docs.length >= limitPerStatus

    const nextCursors: ArchiveCycleCursors = {
      q1LastDoc: snap1.docs.length > 0 ? snap1.docs[snap1.docs.length - 1] : cursors?.q1LastDoc,
      q2LastDoc: snap2.docs.length > 0 ? snap2.docs[snap2.docs.length - 1] : cursors?.q2LastDoc
    }

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
        // Synchroniser vers la collection clients
        const clientSync = await syncPipelineItemToClient(adminDb, doc.id, {
          ...data,
          concludedAt: data.concludedAt || concludedDate
        })

        // RÈGLE CRITIQUE D'INTÉGRITÉ & PROTECTION ANTI-PERTE DE DONNÉES :
        // Ne supprimer la fiche du pipeline QUE si la synchronisation a effectivement
        // créé ou mis à jour le client (clientSync !== null).
        // Si le statut a basculé concurremment (ex: repassé en prospection ou négociation),
        // syncPipelineItemToClient renvoie null et la fiche est conservée intacte dans le pipeline.
        if (clientSync) {
          await doc.ref.delete()
          archivedCount++
        } else {
          console.warn(
            `[runMonthlyPipelineCycleAutoArchive] Fiche ${doc.id} préservée dans le pipeline : ` +
              `statut non conclu lors de la relecture fraîche.`
          )
        }
      }
    }

    return { archivedCount, hasMore, nextCursors }
  } catch (err) {
    console.error('[runMonthlyPipelineCycleAutoArchive] error:', err)
    throw err
  }
}
