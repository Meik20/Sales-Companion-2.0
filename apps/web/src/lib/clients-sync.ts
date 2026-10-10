import type { Firestore } from 'firebase-admin/firestore'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * Synchronise un prospect conclu du pipeline vers la collection "clients" (Base de données clients).
 * Enregistre les métadonnées de l'entreprise, du deal et surtout les informations relatives
 * au membre de l'équipe (commercial) ayant conclu la vente.
 */
export async function syncPipelineItemToClient(
  adminDb: Firestore,
  pipelineId: string,
  pipelineData: Record<string, any>
) {
  const status = String(pipelineData.status || '').toLowerCase().trim()
  if (status !== 'conclue' && status !== 'conclusion') {
    return null
  }

  const clientId = `client_${pipelineId}`
  const clientRef = adminDb.collection('clients').doc(clientId)
  const existingSnap = await clientRef.get()

  // Déterminer le commercial vendeur (assignedTo en priorité, sinon le créateur de la fiche)
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

  const now = Timestamp.now()
  const concludedAt = pipelineData.concludedAt
    ? (pipelineData.concludedAt.toDate ? pipelineData.concludedAt : Timestamp.fromDate(new Date(pipelineData.concludedAt)))
    : now

  const clientPayload: Record<string, any> = {
    companyName: pipelineData.companyName || pipelineData.name || 'Sans nom',
    contactName: pipelineData.contactName || pipelineData.contact || '',
    companyPhone: pipelineData.companyPhone || pipelineData.phone || '',
    companyEmail: pipelineData.companyEmail || pipelineData.email || '',
    companySector: pipelineData.companySector || pipelineData.sector || '',
    companyCity: pipelineData.companyCity || pipelineData.city || '',
    address: pipelineData.address || '',
    country: pipelineData.country || 'Cameroun',
    amount: pipelineData.amount != null ? Number(pipelineData.amount) : (pipelineData.estimatedDeal != null ? Number(pipelineData.estimatedDeal) : null),
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
