import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 *
 * Réponse IMMÉDIATE pour la détection de connectivité réseau côté client mobile.
 * Répond TOUJOURS HTTP 200 dès que la requête atteint le serveur Vercel,
 * indépendamment de l'état de Firestore.
 *
 * IMPORTANT : Ne pas bloquer ce endpoint sur Firestore.
 * Le probe réseau (useNetworkStatus) utilise ce endpoint uniquement pour vérifier
 * que le mobile a bien un accès internet fonctionnel, PAS que Firestore répond.
 * Un timeout Firestore de 3s ferait faussement passer le mobile en mode hors-ligne.
 *
 * La santé Firestore est vérifiée en arrière-plan de façon non bloquante.
 */
export async function GET() {
  const start = Date.now()

  // Probe Firestore en arrière-plan (non bloquant, ne conditionne PAS le statut HTTP)
  let firestoreStatus = 'unknown'
  try {
    const { adminDb } = await import('@/lib/firebase-admin')
    const firestorePromise = adminDb.collection('app_config').limit(1).get()
    // On accorde 2.5s à Firestore — si plus lent, on répond quand même 200
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
    const result = await Promise.race([firestorePromise, timeoutPromise])
    firestoreStatus = result !== null ? 'connected' : 'timeout'
  } catch {
    firestoreStatus = 'error'
  }

  const duration = Date.now() - start

  // Répondre TOUJOURS 200 : le serveur Vercel est atteignable
  // => le mobile EST connecté à internet, même si Firestore est temporairement lent
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        firestore: firestoreStatus,
        latencyMs: duration
      },
      env: process.env.NODE_ENV || 'development'
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    }
  )
}
