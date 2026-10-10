export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/crm/clients/clear
 * Permet à un agent support de vider l'ensemble de son CRM
 * SANS JAMAIS impacter la base de données clients du Team Manager
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let agentUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      agentUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const agentDoc = await adminDb.collection('users').doc(agentUid).get()
    const agentData = agentDoc.data()
    if (!agentData || !['support_agent', 'manager', 'admin'].includes(agentData.role)) {
      return NextResponse.json({ message: 'Action non autorisée' }, { status: 403 })
    }

    let dismissedClientsCount = 0
    let deletedCrmClientsCount = 0

    // 1. Découplage pour les agents support :
    // Masquer les fiches de la collection 'clients' sans toucher aux données du Team Manager
    if (agentData.role === 'support_agent') {
      const managerUids: string[] = [
        agentData.managerUid,
        ...(agentData.linkedManagerUids ?? [])
      ].filter(Boolean)

      if (managerUids.length > 0) {
        const clientSnaps = await Promise.all(
          managerUids.map((uid) =>
            adminDb
              .collection('clients')
              .where('managerUid', '==', uid)
              .limit(500)
              .get()
          )
        )

        const batch = adminDb.batch()
        let batchOps = 0

        for (const snap of clientSnaps) {
          for (const doc of snap.docs) {
            const data = doc.data()
            if (!Array.isArray(data.dismissedBySupportAgents) || !data.dismissedBySupportAgents.includes(agentUid)) {
              batch.update(doc.ref, {
                dismissedBySupportAgents: FieldValue.arrayUnion(agentUid)
              })
              batchOps++
              dismissedClientsCount++
              if (batchOps >= 400) {
                await batch.commit()
                batchOps = 0
              }
            }
          }
        }
        if (batchOps > 0) {
          await batch.commit()
        }
      }
    }

    // 2. Supprimer les entrées locales propres au CRM (crm_clients créés manuellement par cet utilisateur)
    let crmQuery = adminDb.collection('crm_clients') as any
    if (agentData.role === 'support_agent') {
      crmQuery = crmQuery.where('owner', '==', agentUid).limit(500)
    } else if (agentData.role === 'manager') {
      crmQuery = crmQuery.where('managerUid', '==', agentUid).limit(500)
    }

    const crmSnap = await crmQuery.get()
    if (!crmSnap.empty) {
      const delBatch = adminDb.batch()
      crmSnap.docs.forEach((doc: any) => {
        delBatch.delete(doc.ref)
        deletedCrmClientsCount++
      })
      await delBatch.commit()
    }

    return NextResponse.json({
      success: true,
      message: 'Votre CRM a été vidé avec succès.',
      dismissedClientsCount,
      deletedCrmClientsCount
    })
  } catch (error) {
    console.error('[crm/clients/clear POST]', error)
    return NextResponse.json({ message: 'Erreur lors de la réinitialisation du CRM' }, { status: 500 })
  }
}
