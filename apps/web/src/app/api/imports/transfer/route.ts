import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/imports/transfer
 * Permet au Senior Manager de transférer des prospects importés (collection manager_prospects)
 * vers un Team Manager de la même organisation.
 *
 * RÈGLE D'OR ARCHITECTURALE :
 * - C'est un TRANSFERT vers un Team Manager et NON UNE ASSIGNATION à un commercial.
 * - Le managerId devient le targetManagerUid.
 * - assignedTo est explicitement vidé (null).
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    }

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Session expirée ou token invalide' }, { status: 401 })
    }

    // Vérifier les droits du Senior Manager
    const callerDoc = await adminDb.collection('users').doc(callerUid).get()
    const callerData = callerDoc.data()
    if (!hasActivePaidManagerAccess(callerData) || callerData?.orgRole !== 'senior_manager') {
      return NextResponse.json(
        { message: 'Action réservée au Senior Manager avec abonnement actif' },
        { status: 403 }
      )
    }

    const orgCode = callerData.orgCode
    if (!orgCode) {
      return NextResponse.json(
        { message: 'Aucun code organisation associé à votre compte' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps de requête invalide' }, { status: 400 })
    }

    const { targetManagerUid, prospectIds, deadline } = body as {
      targetManagerUid?: string
      prospectIds?: string[]
      deadline?: string | null
    }

    if (!targetManagerUid) {
      return NextResponse.json(
        { message: 'Veuillez sélectionner un Team Manager cible' },
        { status: 400 }
      )
    }

    if (targetManagerUid === callerUid) {
      return NextResponse.json(
        { message: 'Le manager cible ne peut pas être le Senior Manager lui-même' },
        { status: 400 }
      )
    }

    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { message: 'Veuillez sélectionner au moins un prospect à transférer' },
        { status: 400 }
      )
    }

    // Vérifier que le manager cible existe, est manager et fait partie de la même organisation
    const targetDoc = await adminDb.collection('users').doc(targetManagerUid).get()
    const targetData = targetDoc.data()
    if (!targetDoc.exists || !targetData) {
      return NextResponse.json({ message: 'Team Manager cible introuvable' }, { status: 404 })
    }

    if (targetData.orgCode !== orgCode || targetData.role !== 'manager') {
      return NextResponse.json(
        { message: "Le manager cible n'appartient pas à votre organisation" },
        { status: 400 }
      )
    }

    const targetManagerName =
      targetData.displayName || targetData.name || targetData.email || 'Team Manager'

    // Récupérer les prospects dans manager_prospects
    const prospectsToTransfer: FirebaseFirestore.DocumentSnapshot[] = []
    const uniqueIds = Array.from(new Set(prospectIds))

    for (const id of uniqueIds) {
      const pDoc = await adminDb.collection('manager_prospects').doc(id).get()
      if (pDoc.exists) {
        const pData = pDoc.data()
        // Vérifier que le prospect appartient au Senior Manager (soit managerId soit importedBy)
        if (
          pData?.managerId === callerUid ||
          pData?.importedBy === callerUid ||
          pData?.transferredFromSeniorUid === callerUid
        ) {
          prospectsToTransfer.push(pDoc)
        }
      }
    }

    if (prospectsToTransfer.length === 0) {
      return NextResponse.json(
        { message: 'Aucun prospect éligible trouvé pour le transfert' },
        { status: 404 }
      )
    }

    // Exécuter la mise à jour par lot (batch Firestore limité à 500 ops)
    let batch = adminDb.batch()
    let opCount = 0
    let transferredCount = 0
    const now = new Date()

    const commitBatchIfFull = async () => {
      if (opCount >= 400) {
        await batch.commit()
        batch = adminDb.batch()
        opCount = 0
      }
    }

    for (const doc of prospectsToTransfer) {
      batch.update(doc.ref, {
        managerId: targetManagerUid, // Le Team Manager devient propriétaire
        transferredFromSeniorUid: callerUid,
        transferredToManagerUid: targetManagerUid,
        transferredToManagerName: targetManagerName,
        transferredAt: now,
        assignedTo: null, // Non assigné à un commercial : le TM l'assignera
        transferDeadline: deadline || null, // Échéance de transfert fixée par le Senior Manager
        assignmentDeadline: deadline || null, // Échéance initiale
        updatedAt: now
      })
      opCount++
      transferredCount++
      await commitBatchIfFull()
    }

    if (opCount > 0) {
      await batch.commit()
    }

    // Mise à jour heartbeat de l'organisation pour réactivité temps réel
    if (orgCode) {
      try {
        await adminDb.collection('organisations').doc(orgCode).update({
          lastPipelineUpdate: now.toISOString(),
          lastImportsUpdate: now.toISOString()
        })
      } catch (orgErr) {
        console.warn('[POST /api/imports/transfer] lastImportsUpdate write failed:', orgErr)
      }
    }

    // Notification automatique In-App et Email pour le Team Manager destinataire
    try {
      const { createUserNotification } = await import('@/lib/user-notifications')
      const { sendProspectTransferEmail } = await import('@/lib/notification-emails')
      const callerName =
        callerData.displayName || callerData.name || callerData.email || 'Senior Manager'
      const deadlineText = deadline
        ? ` avec une échéance fixée au ${new Date(deadline).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
          })}`
        : ''

      await createUserNotification({
        userId: targetManagerUid,
        type: 'prospect_transfer',
        title: 'Nouveaux prospects transférés',
        message: `Le Senior Manager (${callerName}) vous a transféré ${transferredCount} prospect(s)${deadlineText}. Retrouvez-les dans "Gestion d'équipe > Mes prospects importés" pour les attribuer à votre équipe.`,
        link: '/team?tab=imports',
        metadata: {
          count: transferredCount,
          senderUid: callerUid,
          senderName: callerName,
          deadline: deadline || null
        }
      })

      if (targetData.email) {
        await sendProspectTransferEmail({
          to: targetData.email,
          recipientName: targetManagerName,
          senderName: callerName,
          count: transferredCount,
          deadline: deadline || null
        })
      }
    } catch (notifErr) {
      console.warn('[POST /api/imports/transfer] Erreur envoi notification:', notifErr)
    }

    return NextResponse.json({
      success: true,
      count: transferredCount,
      targetManager: {
        uid: targetManagerUid,
        name: targetManagerName
      }
    })
  } catch (error: any) {
    console.error('[POST /api/imports/transfer] error:', error)
    return NextResponse.json(
      { message: error?.message || 'Erreur interne lors du transfert' },
      { status: 500 }
    )
  }
}
