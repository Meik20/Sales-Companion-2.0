import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { checkAndExpireUser } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

/**
 * POST /api/subscription/check-expiry
 * ----------------------------------
 * Vérifie et applique l'expiration de l'abonnement de l'utilisateur courant.
 * Si la date d'échéance à minuit le 30ème jour est dépassée, il est rétrogradé
 * immédiatement vers "free" et les quotas sont réinitialisés.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 })
    }

    let uid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      uid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const result = await checkAndExpireUser(uid)

    return NextResponse.json({
      success: true,
      uid,
      expired: result.expired,
      currentPlan: result.plan,
      expiresAt: result.expiresAt
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    console.error('[subscription/check-expiry]', err)
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
