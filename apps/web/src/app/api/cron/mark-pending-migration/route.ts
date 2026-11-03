export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { markPendingMigrationDeals } from '@/server/services/mark-pending-migration.service'

async function getAdmin() {
  const { adminDb } = await import('@/lib/firebase-admin')
  return { adminDb }
}

/**
 * GET / POST /api/cron/mark-pending-migration
 *
 * Tâche cron déclenchée le 1er de chaque mois à 00:01 (UTC).
 * Marque toutes les opportunités conclues du mois M-1 avec `pendingMigration: true`
 * en attente de leur migration vers la base clients (archivage J+3).
 *
 * Sécurisée par CRON_SECRET (en-tête Authorization ou x-cron-key).
 */
export async function GET(request: NextRequest) {
  return handleMarkPendingMigrationCron(request)
}

export async function POST(request: NextRequest) {
  return handleMarkPendingMigrationCron(request)
}

async function handleMarkPendingMigrationCron(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error(
        '[cron/mark-pending-migration] CRON_SECRET absent de la configuration.'
      )
      return NextResponse.json(
        { message: 'Service non disponible : configuration CRON_SECRET manquante.' },
        { status: 503 }
      )
    }

    const providedSecret =
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      request.headers.get('x-cron-key')

    if (!providedSecret || providedSecret !== cronSecret) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 })
    }

    const { adminDb } = await getAdmin()
    const now = new Date()

    const result = await markPendingMigrationDeals(adminDb, now)

    return NextResponse.json({
      success: true,
      message: `${result.markedCount} opportunité(s) marquée(s) pendingMigration. ${result.alreadyMarkedCount} déjà marquée(s). ${result.skippedCount} ignorée(s).`,
      ...result,
      timestamp: now.toISOString()
    })
  } catch (error) {
    console.error('[cron/mark-pending-migration]', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erreur serveur lors du marquage pendingMigration',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}

