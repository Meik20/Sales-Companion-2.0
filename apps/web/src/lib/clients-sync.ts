import type { Firestore } from 'firebase-admin/firestore'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * Synchronise un prospect conclu du pipeline vers la collection "clients" (Base de données clients).
 *
 * ARCHITECTURE :
 * - Cette fonction relit TOUJOURS les données fraîches depuis Firestore avant de construire
 *   le payload client. Cela garantit que le montant (amount), le statut et tous les champs
 *   sont à jour au moment de la synchro, quelle que soit la séquence d'écriture côté client.
 * - Les données passées en `pipelineDataHint` servent de fallback si le document pipeline
 *   est introuvable (ex: déjà archivé ou en cours de suppression).
 */
export async function syncPipelineItemToClient(
  adminDb: Firestore,
  pipelineId: string,
  pipelineDataHint: Record<string, any> = {}
) {
  // ── Relecture fraîche depuis Firestore (source de vérité absolue) ──────────
  let pipelineData: Record<string, any> = pipelineDataHint

  try {
    const freshDoc = await adminDb.collection('pipeline').doc(pipelineId).get()
    if (freshDoc.exists) {
      // Les données fraîches ont priorité sur le hint passé en paramètre
      pipelineData = { ...pipelineDataHint, ...freshDoc.data() }
    }
    // Si le document n'existe plus (déjà archivé), on utilise pipelineDataHint
  } catch (e) {
    console.warn('[syncPipelineItemToClient] Impossible de relire la fiche pipeline fraîche:', e)
    // On continue avec le hint
  }

  // ── Validation du statut ───────────────────────────────────────────────────
  const status = String(pipelineData.status || '').toLowerCase().trim()
  if (status !== 'conclue' && status !== 'conclusion') {
    return null
  }

  const clientId = `client_${pipelineId}`
  const clientRef = adminDb.collection('clients').doc(clientId)
  const existingSnap = await clientRef.get()

  // ── Résolution du commercial vendeur ──────────────────────────────────────
  // assignedTo en priorité (commercial terrain), sinon le créateur de la fiche
  const assignedUid = pipelineData.assignedTo || pipelineData.userId || null
  let assignedName = pipelineData.memberName || pipelineData.assignedName || null
  let assignedEmail = pipelineData.memberEmail || pipelineData.assignedEmail || null
  let assignedRole = 'member'

  if (assignedUid && (!assignedName || !assignedEmail)) {
    try {
      const userDoc = await adminDb.collection('users').doc(assignedUid).get()
      if (userDoc.exists) {
        const uData = userDoc.data() || {}
        assignedName = assignedName || uData.name || uData.displayName || uData.email || 'Commercial'
        assignedEmail = assignedEmail || uData.email || null
        assignedRole = uData.role || 'member'
      }
    } catch (e) {
      console.warn('[syncPipelineItemToClient] Impossible de récupérer le profil du vendeur:', e)
    }
  }

  // ── Date de conclusion ─────────────────────────────────────────────────────
  const now = Timestamp.now()
  const concludedAt = pipelineData.concludedAt
    ? (pipelineData.concludedAt.toDate
        ? pipelineData.concludedAt
        : Timestamp.fromDate(new Date(pipelineData.concludedAt)))
    : now

  // ── Montant du deal ────────────────────────────────────────────────────────
  // Priorité : amount > estimatedDeal > null
  // On s'assure de ne JAMAIS écrire null si l'une des deux sources est valide
  let dealAmount: number | null = null
  if (pipelineData.amount != null && pipelineData.amount !== '') {
    dealAmount = Number(pipelineData.amount)
  } else if (pipelineData.estimatedDeal != null && pipelineData.estimatedDeal !== '') {
    dealAmount = Number(pipelineData.estimatedDeal)
  }

  // ── Construction du payload client ────────────────────────────────────────
  const clientPayload: Record<string, any> = {
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

  if (!existingSnap.exists) {
    clientPayload.createdAt = now
    clientPayload.dismissedBySupportAgents = []
    await clientRef.set(clientPayload)
  } else {
    await clientRef.update(clientPayload)
  }

  return { id: clientId, ...clientPayload }
}
