export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { syncPipelineItemToClient } from '@/lib/clients-sync'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/clients/sync-concluded
 * Synchronise un prospect passé à l'état CONCLUE vers la collection "clients".
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let uid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      uid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const body = await request.json()
    const { pipelineId } = body
    if (!pipelineId) {
      return NextResponse.json({ message: 'pipelineId requis' }, { status: 400 })
    }

    const pipeRef = adminDb.collection('pipeline').doc(pipelineId)
    const pipeSnap = await pipeRef.get()
    if (!pipeSnap.exists) {
      return NextResponse.json({ message: 'Fiche pipeline introuvable' }, { status: 404 })
    }

    const pipeData = pipeSnap.data() || {}

    // Vérifier les droits d'accès
    if (
      pipeData.userId !== uid &&
      pipeData.assignedTo !== uid &&
      pipeData.managerUid !== uid
    ) {
      const userDoc = await adminDb.collection('users').doc(uid).get()
      const userData = userDoc.data() || {}
      if (userData.role !== 'admin' && userData.role !== 'manager') {
        return NextResponse.json({ message: 'Accès non autorisé' }, { status: 403 })
      }
    }

    // S'assurer que le timestamp concludedAt est posé sur la fiche pipeline
    if (!pipeData.concludedAt) {
      await pipeRef.update({
        concludedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      pipeData.concludedAt = Timestamp.now()
    }

    const client = await syncPipelineItemToClient(adminDb, pipelineId, pipeData)

    return NextResponse.json({ success: true, client })
  } catch (error) {
    console.error('[sync-concluded POST]', error)
    return NextResponse.json({ message: 'Erreur lors de la synchronisation' }, { status: 500 })
  }
}
