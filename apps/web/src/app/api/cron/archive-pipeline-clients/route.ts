export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { syncPipelineItemToClient } from '@/lib/clients-sync'

async function getAdmin() {
  const { adminDb } = await import('@/lib/firebase-admin')
  return { adminDb }
}

/**
 * Vérifie si une opportunité conclue est éligible au transfert automatique :
 * 3 jours après la fin du mois au cours duquel le deal a été conclu.
 * Exemple : deal conclu le 12 octobre -> fin du mois = 31 oct -> 3 jours après = 3 nov à 23:59:59.
 */
function isEligibleForAutoArchive(concludedDate: Date, now: Date): boolean {
  const year = concludedDate.getFullYear()
  const month = concludedDate.getMonth() // 0 à 11
  // 3 jours après la fin du mois = le 3 du mois suivant à 23:59:59.999
  const cutoff = new Date(year, month + 1, 3, 23, 59, 59, 999)
  return now.getTime() >= cutoff.getTime()
}

/**
 * GET /api/cron/archive-pipeline-clients
 * Tâche d'arrière-plan / cron qui archive les opportunités conclues 3 jours après la fin du mois.
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

        if (concludedDate && !isNaN(concludedDate.getTime()) && isEligibleForAutoArchive(concludedDate, now)) {
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
