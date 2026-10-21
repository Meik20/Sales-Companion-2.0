export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { runMonthlyPipelineCycleAutoArchive } from '@/server/services/monthly-cycle-archive.service'

async function getAdmin() {
  const { adminDb } = await import('@/lib/firebase-admin')
  return { adminDb }
}

/**
 * GET / POST /api/cron/archive-pipeline-clients
 * Tâche d'arrière-plan / cron qui archive les opportunités conclues 3 jours après la fin du mois.
 * Elles sont synchronisées dans la "Base de données clients" (collection clients)
 * et retirées du pipeline opérationnel.
 */
export async function GET(request: NextRequest) {
  return handleArchiveCron(request)
}

export async function POST(request: NextRequest) {
  return handleArchiveCron(request)
}

async function handleArchiveCron(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET

    // CRON_SECRET est obligatoire — refus immédiat si absent (misconfiguration de sécurité)
    if (!cronSecret) {
      console.error(
        '[cron/archive-pipeline-clients] CRON_SECRET est absent de la configuration. ' +
          "Définissez cette variable d'environnement avant de déployer."
      )
      return NextResponse.json(
        { message: 'Service non disponible : configuration CRON_SECRET manquante.' },
        { status: 503 }
      )
    }

    const providedSecret =
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      request.nextUrl.searchParams.get('key') ||
      request.headers.get('x-cron-key')

    if (providedSecret !== cronSecret) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 })
    }

    const { adminDb } = await getAdmin()

    // Traitement en boucle par lots successifs pour drainer les arriérés sans dépasser le timeout serverless
    let totalArchived = 0
    let hasMore = true
    let batchesRun = 0
    const MAX_BATCHES = 5 // 5 lots x 300 = jusqu'à 1500 fiches par exécution

    while (hasMore && batchesRun < MAX_BATCHES) {
      batchesRun++
      const res = await runMonthlyPipelineCycleAutoArchive(adminDb, undefined, 300)
      totalArchived += res.archivedCount
      hasMore = res.hasMore
    }

    const now = new Date()

    return NextResponse.json({
      success: true,
      message: `${totalArchived} prospect(s) conclu(s) archivé(s) vers la Base de données clients (${batchesRun} lot(s) traité(s))`,
      archivedCount: totalArchived,
      batchesRun,
      hasMore,
      timestamp: now.toISOString()
    })
  } catch (error) {
    console.error('[archive-pipeline-clients CRON]', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erreur serveur lors de l’archivage',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}
