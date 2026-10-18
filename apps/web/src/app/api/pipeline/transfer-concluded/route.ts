export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { syncPipelineItemToClient } from '@/lib/clients-sync'

async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/pipeline/transfer-concluded
 * Permet au Team Manager (ou Senior Manager) de transférer manuellement les opportunités
 * conclues vers la base de données clients à la fin du mois.
 *
 * Body :
 * - itemIds?: string[] (liste d'IDs spécifiques à transférer)
 * - memberId?: string (transférer toutes les fiches conclues de ce membre)
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdminModules()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    }

    let userId: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userId = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // Vérifier les droits du demandeur
    const userSnap = await adminDb.collection('users').doc(userId).get()
    if (!userSnap.exists) {
      return NextResponse.json({ message: 'Utilisateur introuvable' }, { status: 404 })
    }

    const userData = userSnap.data() || {}
    const isManager = userData.role === 'manager'
    const isAdmin = userData.role === 'admin'
    const isSeniorManager = isManager && userData.orgRole === 'senior_manager'

    if (!isManager && !isAdmin) {
      return NextResponse.json(
        { message: 'Action réservée aux managers et administrateurs' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { itemIds, memberId } = body as { itemIds?: string[]; memberId?: string }

    let targetDocs: FirebaseFirestore.QueryDocumentSnapshot[] = []

    if (Array.isArray(itemIds) && itemIds.length > 0) {
      // 1. Récupération par IDs ciblés
      const chunks: string[][] = []
      for (let i = 0; i < itemIds.length; i += 30) {
        chunks.push(itemIds.slice(i, i + 30))
      }
      for (const chunk of chunks) {
        const snap = await adminDb
          .collection('pipeline')
          .where('__name__', 'in', chunk)
          .get()
        targetDocs.push(...snap.docs)
      }
    } else if (memberId && memberId !== 'all') {
      // 2. Récupération pour un membre spécifique
      const snap = await adminDb
        .collection('pipeline')
        .where('assignedTo', '==', memberId)
        .get()
      targetDocs = snap.docs
    } else {
      // 3. Récupération globale pour le manager ou l'organisation
      if (isSeniorManager && userData.orgCode) {
        // En vue organisation SM : récupérer par orgCode ou seniorManagerUid
        const snap = await adminDb
          .collection('pipeline')
          .where('orgCode', '==', userData.orgCode)
          .get()
        targetDocs = snap.docs
      } else {
        // Pour un Team Manager : récupérer ses fiches managées
        const snap = await adminDb
          .collection('pipeline')
          .where('managerUid', '==', userId)
          .get()
        targetDocs = snap.docs
      }
    }

    let transferredCount = 0
    const now = new Date()

    for (const doc of targetDocs) {
      const data = doc.data() || {}
      const st = String(data.status || '').toLowerCase().trim()
      if (st !== 'conclue' && st !== 'conclusion') {
        continue
      }

      // Vérification des droits sur la fiche
      const belongsToManager =
        data.managerUid === userId ||
        data.seniorManagerUid === userId ||
        data.userId === userId ||
        (userData.orgCode && data.orgCode === userData.orgCode)

      if (!belongsToManager && !isAdmin) {
        continue
      }

      // Synchronisation vers la collection "clients"
      await syncPipelineItemToClient(adminDb, doc.id, {
        ...data,
        concludedAt: data.concludedAt || now
      })

      // Suppression de la collection pipeline (archivage complété)
      await doc.ref.delete()
      transferredCount++
    }

    return NextResponse.json({
      success: true,
      transferredCount,
      message: `${transferredCount} opportunité(s) conclue(s) transférée(s) avec succès dans la base clients.`
    })
  } catch (error) {
    console.error('[POST /api/pipeline/transfer-concluded] Erreur:', error)
    return NextResponse.json(
      { message: 'Erreur interne lors du transfert manuel' },
      { status: 500 }
    )
  }
}
