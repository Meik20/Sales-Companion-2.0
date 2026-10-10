export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { syncPipelineItemToClient } from '@/lib/clients-sync'

async function getAdmin() {
  const { adminDb } = await import('@/lib/firebase-admin')
  return { adminDb }
}

/**
 * GET /api/cron/archive-pipeline-clients
 * Tâche d'arrière-plan / cron qui archive les opportunités conclues depuis plus de 72h.
 * Elles sont enregistrées dans la "Base de données clients" (collection clients)
 * et retirées du pipeline opérationnel.
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb } = await getAdmin()

    // Vérification optionnelle de secret CRON si configuré
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 })
    }

    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000)

    const concludedSnaps = await Promise.all([
      adminDb
        .collection('pipeline')
        .where('status', '==', 'conclue')
        .limit(300)
        .get(),
      adminDb
        .collection('pipeline')
        .where('status', '==', 'conclusion')
        .limit(300)
        .get()
    ])

    let archivedCount = 0
    const now = new Date()

    for (const snap of concludedSnaps) {
      for (const doc of snap.docs) {
        const data = doc.data() || {}
        let concludedDate: Date | null = null

        if (data.concludedAt) {
          concludedDate = data.concludedAt.toDate ? data.concludedAt.toDate() : new Date(data.concludedAt)
        } else if (data.updatedAt) {
          concludedDate = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
        }

        if (concludedDate && concludedDate <= seventyTwoHoursAgo) {
          // 1. S'assurer qu'il est synchronisé dans la base clients
          await syncPipelineItemToClient(adminDb, doc.id, {
            ...data,
            concludedAt: data.concludedAt || concludedDate
          })

          // 2. Supprimer de la collection pipeline
          await doc.ref.delete()
          archivedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${archivedCount} prospect(s) conclu(s) archivé(s) vers la Base de données clients`,
      archivedCount,
      timestamp: now.toISOString()
    })
  } catch (error) {
    console.error('[archive-pipeline-clients CRON]', error)
    return NextResponse.json({ message: 'Erreur serveur lors de l’archivage' }, { status: 500 })
  }
}
