import type { Firestore } from 'firebase-admin/firestore'
import { Timestamp } from 'firebase-admin/firestore'
import { isEligibleForAutoArchive } from './monthly-cycle'

/**
 * Construit de manière pure et déterministe le payload d'un document client
 * à partir des données de l'opportunité pipeline et de l'état existant éventuel.
 */
export function buildClientPayload(
  pipelineId: string,
  pipelineData: Record<string, any>,
  existingClientData?: Record<string, any> | null,
  now: Timestamp = Timestamp.now()
): Record<string, any> {
  const assignedUid = pipelineData.assignedTo || pipelineData.userId || null
  const assignedName = pipelineData.memberName || pipelineData.assignedName || null
  const assignedEmail = pipelineData.memberEmail || pipelineData.assignedEmail || null
  const assignedRole = pipelineData.assignedRole || 'member'

  const concludedAt = pipelineData.concludedAt
    ? (pipelineData.concludedAt.toDate
        ? pipelineData.concludedAt
        : Timestamp.fromDate(new Date(pipelineData.concludedAt)))
    : now

  let dealAmount: number | null = null
  if (pipelineData.amount != null && pipelineData.amount !== '') {
    dealAmount = Number(pipelineData.amount)
  } else if (pipelineData.estimatedDeal != null && pipelineData.estimatedDeal !== '') {
    dealAmount = Number(pipelineData.estimatedDeal)
  }

  const payload: Record<string, any> = {
    companyName: pipelineData.companyName || pipelineData.name || 'Sans nom',
    contactName: pipelineData.contactName || pipelineData.contact || '',
    companyPhone: pipelineData.companyPhone || pipelineData.phone || '',
    companyEmail: pipelineData.companyEmail || pipelineData.email || '',
    companySector: pipelineData.companySector || pipelineData.sector || '',
    companyCity: pipelineData.companyCity || pipelineData.city || '',
    address: pipelineData.address || pipelineData.companyQuarter || pipelineData.quarter || '',
    region: pipelineData.companyRegion || pipelineData.region || '',
    country: pipelineData.country || 'Cameroun',
    amount: dealAmount,
    currency: pipelineData.currency || 'XAF',
    notes: pipelineData.notes || pipelineData.note || '',
    status: 'active',

    // Vendeur / commercial
    assignedTo: assignedUid,
    assignedName: assignedName || 'Commercial terrain',
    assignedEmail: assignedEmail,
    assignedRole,

    // Hiérarchie
    managerUid: pipelineData.managerUid || pipelineData.userId,
    orgCode: pipelineData.orgCode || null,

    // Origine & dates
    pipelineItemId: pipelineId,
    concludedAt,
    updatedAt: now
  }

  if (!existingClientData) {
    payload.createdAt = now
    payload.dismissedBySupportAgents = []
  } else if (existingClientData.createdAt) {
    payload.createdAt = existingClientData.createdAt
  }

  return payload
}

/**
 * Exécute l'archivage atomique et idempotent d'une opportunité conclue :
 * 1. Lit la fiche fraîche au sein d'une transaction Firestore.
 * 2. Vérifie qu'elle existe et que son statut est toujours 'conclue' ou 'conclusion'.
 * 3. REVALIDE STRICTEMENT L'ÉLIGIBILITÉ TEMPORELLE (J+3) sur la date de la fiche fraîche
 *    (concludedAt, ou repli sur updatedAt / createdAt pour les fiches historiques).
 *    Si la date a été modifiée concurremment ou repoussée, la transaction abandonne
 *    immédiatement sans supprimer ni archiver.
 * 4. Enregistre de manière idempotente le client dans la collection `clients`.
 * 5. Supprime la fiche du `pipeline` dans le MÊME commit atomique.
 *
 * RÈGLE D'INTÉGRITÉ ABSOLUE :
 * Si le document n'existe pas, si son statut a changé ou si sa date ne respecte plus
 * l'éligibilité J+3, la transaction n'effectue AUCUNE suppression et préserve les données.
 */
export async function archivePipelineDealAtomically(
  adminDb: Firestore,
  pipelineId: string,
  now: Date = new Date()
): Promise<{
  status: 'archived' | 'skipped_not_concluded' | 'skipped_not_found' | 'skipped_not_eligible'
  clientData?: Record<string, any>
}> {
  return adminDb.runTransaction(async (transaction) => {
    const pipelineRef = adminDb.collection('pipeline').doc(pipelineId)
    const freshSnap = await transaction.get(pipelineRef)

    if (!freshSnap.exists) {
      return { status: 'skipped_not_found' }
    }

    const pipelineData = freshSnap.data() || {}
    const status = String(pipelineData.status || '').toLowerCase().trim()

    // Garde-fou 1 : si le statut a basculé concurremment (ex: repassé en prospection ou négociation),
    // on interrompt immédiatement sans supprimer du pipeline.
    if (status !== 'conclue' && status !== 'conclusion') {
      return { status: 'skipped_not_concluded' }
    }

    // Garde-fou 2 : revalidation stricte de la date fraîche de conclusion et de l'éligibilité J+3
    let freshConcludedDate: Date | null = null
    if (pipelineData.concludedAt) {
      freshConcludedDate = pipelineData.concludedAt.toDate
        ? pipelineData.concludedAt.toDate()
        : new Date(pipelineData.concludedAt)
    } else if (pipelineData.updatedAt) {
      freshConcludedDate = pipelineData.updatedAt.toDate
        ? pipelineData.updatedAt.toDate()
        : new Date(pipelineData.updatedAt)
    } else if (pipelineData.createdAt) {
      freshConcludedDate = pipelineData.createdAt.toDate
        ? pipelineData.createdAt.toDate()
        : new Date(pipelineData.createdAt)
    }

    // Si aucune date n'est valide ou si la fiche fraîche n'est plus éligible (ex: date repoussée),
    // interruption immédiate : aucune suppression ni écriture !
    if (
      !freshConcludedDate ||
      isNaN(freshConcludedDate.getTime()) ||
      !isEligibleForAutoArchive(freshConcludedDate, now)
    ) {
      return { status: 'skipped_not_eligible' }
    }

    const clientId = `client_${pipelineId}`
    const clientRef = adminDb.collection('clients').doc(clientId)
    const existingSnap = await transaction.get(clientRef)

    const nowTs = Timestamp.fromDate(now)
    const payload = buildClientPayload(
      pipelineId,
      {
        ...pipelineData,
        concludedAt: pipelineData.concludedAt || Timestamp.fromDate(freshConcludedDate)
      },
      existingSnap.exists ? existingSnap.data() : null,
      nowTs
    )

    // Écriture du client et suppression de l'opportunité de manière strictement atomique
    transaction.set(clientRef, payload, { merge: true })
    transaction.delete(pipelineRef)

    return { status: 'archived', clientData: { id: clientId, ...payload } }
  })
}

/**
 * Synchronise un prospect conclu du pipeline vers la collection "clients" (Base de données clients).
 * Relecture fraîche obligatoire depuis Firestore (pas de fallback d'effacement).
 */
export async function syncPipelineItemToClient(
  adminDb: Firestore,
  pipelineId: string,
  pipelineDataHint: Record<string, any> = {}
) {
  let pipelineData: Record<string, any> = pipelineDataHint

  const freshDoc = await adminDb.collection('pipeline').doc(pipelineId).get()
  if (freshDoc.exists) {
    pipelineData = { ...pipelineDataHint, ...freshDoc.data() }
  } else if (!pipelineDataHint || Object.keys(pipelineDataHint).length === 0) {
    return null
  }

  const status = String(pipelineData.status || '').toLowerCase().trim()
  if (status !== 'conclue' && status !== 'conclusion') {
    return null
  }

  const clientId = `client_${pipelineId}`
  const clientRef = adminDb.collection('clients').doc(clientId)
  const existingSnap = await clientRef.get()

  const now = Timestamp.now()
  const clientPayload = buildClientPayload(
    pipelineId,
    pipelineData,
    existingSnap.exists ? existingSnap.data() : null,
    now
  )

  await clientRef.set(clientPayload, { merge: true })

  return { id: clientId, ...clientPayload }
}
