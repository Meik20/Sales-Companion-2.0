import { NextRequest, NextResponse } from 'next/server'
import { checkAllExpiredSubscriptions } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

/**
 * GET / POST /api/cron/check-subscriptions
 * ----------------------------------------
 * Point d'entrée pour les tâches planifiées (Cron) ou maintenance automatique.
 * Parcourt tous les comptes payants et rétrograde vers "free" ceux dont le
 * délai de 30 jours à minuit est dépassé.
 */
export async function GET(request: NextRequest) {
  return handleCron(request)
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}

async function handleCron(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Vérification du secret CRON si configuré
    if (cronSecret) {
      const providedSecret =
        authHeader?.replace(/^Bearer\s+/i, '') ||
        request.nextUrl.searchParams.get('key') ||
        request.headers.get('x-cron-key')

      if (providedSecret !== cronSecret) {
        return NextResponse.json({ message: 'Non autorisé' }, { status: 401 })
      }
    }

    const result = await checkAllExpiredSubscriptions()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[cron/check-subscriptions]', err)
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
