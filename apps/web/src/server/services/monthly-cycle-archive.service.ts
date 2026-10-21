/**
 * monthly-cycle-archive.service.ts
 * Service serveur d'archivage automatique des opportunités conclues (J+3).
 */

import type { Firestore } from 'firebase-admin/firestore'
import { Timestamp } from 'firebase-admin/firestore'
import { archivePipelineDealAtomically } from '../../lib/clients-sync'
import { isEligibleForAutoArchive, getMaxEligibleConcludedDate } from '../../lib/monthly-cycle'

export interface ArchiveCycleCursors {
  q1LastDoc?: FirebaseFirestore.DocumentSnapshot
  q2LastDoc?: FirebaseFirestore.DocumentSnapshot
  catchupLastDoc?: FirebaseFirestore.DocumentSnapshot
}

/**
 * Exécute la purge et l'archivage automatique des opportunités conclues éligibles (J+3 dépassé).
 * Cette fonction est strictement atomique et idempotente :
 * - Sélectionne directement les opportunités conclues dont la date d'éligibilité est échue
 *   (concludedAt < maxEligibleDate) pour éviter de bloquer sur les fiches récentes non éligibles.
 * - Inclut une passe de rattrapage dédiée pour les fiches conclues historiques sans concludedAt
 *   (résolues via updatedAt ou createdAt).
 * - Utilise une transaction Firestore atomique pour synchroniser vers `clients` et supprimer du `pipeline`.
 * - Revalide l'éligibilité J+3 et le statut au sein de la transaction : si le statut ou la date
 *   ont basculé concurremment, la transaction n'effectue AUCUNE suppression.
 */
export async function runMonthlyPipelineCycleAutoArchive(
  adminDb: Firestore,
  filterManagerUid?: string,
  limitPerStatus: number = 300,
  cursors?: ArchiveCycleCursors
): Promise<{
  archivedCount: number
  hasMore: boolean
  nextCursors?: ArchiveCycleCursors
  maxEligibleDate: string
}> {
  try {
    const now = new Date()
    const maxEligibleDate = getMaxEligibleConcludedDate(now)
    const maxEligibleTimestamp = Timestamp.fromDate(maxEligibleDate)

    let snap1: FirebaseFirestore.QuerySnapshot
    let snap2: FirebaseFirestore.QuerySnapshot

    try {
      // 1. Requête optimisée ciblée sur les dates échues (utilise les index composites Firestore)
      let q1 = adminDb
        .collection('pipeline')
        .where('status', '==', 'conclue')
        .where('concludedAt', '<', maxEligibleTimestamp)
        .orderBy('concludedAt', 'asc') as FirebaseFirestore.Query

      let q2 = adminDb
        .collection('pipeline')
        .where('status', '==', 'conclusion')
        .where('concludedAt', '<', maxEligibleTimestamp)
        .orderBy('concludedAt', 'asc') as FirebaseFirestore.Query

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

      ;[snap1, snap2] = await Promise.all([q1.limit(limitPerStatus).get(), q2.limit(limitPerStatus).get()])
    } catch (queryErr: any) {
      // Repli gracieux si les index composites ne sont pas encore prêts (ou dans les mocks de test)
      console.warn('[runMonthlyPipelineCycleAutoArchive] Index repli actif:', queryErr?.message || queryErr)
      let fbQ1 = adminDb.collection('pipeline').where('status', '==', 'conclue') as FirebaseFirestore.Query
      let fbQ2 = adminDb.collection('pipeline').where('status', '==', 'conclusion') as FirebaseFirestore.Query

      if (filterManagerUid) {
        fbQ1 = fbQ1.where('managerUid', '==', filterManagerUid)
        fbQ2 = fbQ2.where('managerUid', '==', filterManagerUid)
      }
      if (cursors?.q1LastDoc) fbQ1 = fbQ1.startAfter(cursors.q1LastDoc)
      if (cursors?.q2LastDoc) fbQ2 = fbQ2.startAfter(cursors.q2LastDoc)

      ;[snap1, snap2] = await Promise.all([fbQ1.limit(limitPerStatus).get(), fbQ2.limit(limitPerStatus).get()])
    }

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

    // 2. Passe de rattrapage dédiée pour les fiches conclues historiques SANS concludedAt
    // Dans Firestore, un filtre 'where(concludedAt, <, ...)' ignore les documents où le champ est absent.
    // Cette passe récupère les opportunités conclues pour identifier et traiter les fiches orphelines.
    try {
      let catchupQ1 = adminDb.collection('pipeline').where('status', '==', 'conclue') as FirebaseFirestore.Query
      let catchupQ2 = adminDb.collection('pipeline').where('status', '==', 'conclusion') as FirebaseFirestore.Query

      if (filterManagerUid) {
        catchupQ1 = catchupQ1.where('managerUid', '==', filterManagerUid)
        catchupQ2 = catchupQ2.where('managerUid', '==', filterManagerUid)
      }
      if (cursors?.catchupLastDoc) {
        catchupQ1 = catchupQ1.startAfter(cursors.catchupLastDoc)
      }

      const [cSnap1, cSnap2] = await Promise.all([
        catchupQ1.limit(100).get().catch(() => ({ docs: [] } as any)),
        catchupQ2.limit(100).get().catch(() => ({ docs: [] } as any))
      ])

      const catchupDocs = [...(cSnap1.docs || []), ...(cSnap2.docs || [])]
      if (catchupDocs.length > 0) {
        nextCursors.catchupLastDoc = catchupDocs[catchupDocs.length - 1]
      }

      for (const d of catchupDocs) {
        if (seenIds.has(d.id)) continue
        const dData = d.data() || {}
        // Fiche historique orpheline sans champ concludedAt
        if (!dData.concludedAt) {
          let effectiveDate: Date | null = null
          if (dData.updatedAt) {
            effectiveDate = dData.updatedAt.toDate ? dData.updatedAt.toDate() : new Date(dData.updatedAt)
          } else if (dData.createdAt) {
            effectiveDate = dData.createdAt.toDate ? dData.createdAt.toDate() : new Date(dData.createdAt)
          }

          if (effectiveDate && !isNaN(effectiveDate.getTime())) {
            if (isEligibleForAutoArchive(effectiveDate, now)) {
              seenIds.add(d.id)
              docs.push(d)
            } else {
              // Date récente : on régularise le champ concludedAt pour les cycles futurs
              d.ref.update({ concludedAt: Timestamp.fromDate(effectiveDate) }).catch(() => {})
            }
          }
        }
      }
    } catch (catchupErr: any) {
      console.warn('[runMonthlyPipelineCycleAutoArchive] Rattrapage fiches sans concludedAt:', catchupErr?.message || catchupErr)
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
        // ARCHIVAGE ATOMIQUE DANS UNE TRANSACTION FIRESTORE :
        // 1. Relit la fiche fraîche dans la transaction.
        // 2. Vérifie qu'elle existe et est toujours conclue.
        // 3. Revalide l'éligibilité temporelle (J+3) sur la fiche fraîche.
        // 4. Écrit dans `clients` et supprime de `pipeline` de façon atomique.
        // Si le statut a basculé concurremment ou si la date a été modifiée/repoussée,
        // la transaction n'effectue AUCUNE suppression.
        const result = await archivePipelineDealAtomically(adminDb, doc.id, now)
        if (result.status === 'archived') {
          archivedCount++
        } else {
          console.warn(
            `[runMonthlyPipelineCycleAutoArchive] Fiche ${doc.id} préservée dans le pipeline (résultat: ${result.status}).`
          )
        }
      }
    }

    return { archivedCount, hasMore, nextCursors, maxEligibleDate: maxEligibleDate.toISOString() }
  } catch (err) {
    console.error('[runMonthlyPipelineCycleAutoArchive] error:', err)
    throw err
  }
}
