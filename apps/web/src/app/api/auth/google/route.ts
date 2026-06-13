import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/google
 *
 * Vercel-only serverless route.
 * Receives a Firebase ID token from the client after signInWithPopup/Redirect,
 * verifies it server-side with Firebase Admin SDK, and returns the decoded claims.
 *
 * The actual Firestore profile upsert is done on the client (useAuthActions.ts)
 * directly via the Firebase client SDK, so this route is lightweight and purely
 * used for server-side token verification (e.g. if you need a server session cookie).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body?.idToken) {
      return NextResponse.json({ error: 'idToken manquant.' }, { status: 400 })
    }

    const { idToken } = body as { idToken: string }

    // Lazy import — keeps Firebase Admin out of the client bundle
    const { adminAuth } = await import('@/lib/firebase-admin')

    const decoded = await adminAuth.verifyIdToken(idToken, true /* checkRevoked */)

    return NextResponse.json({
      success: true,
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name ?? null,
      picture: decoded.picture ?? null,
      provider: decoded.firebase?.sign_in_provider ?? 'google.com'
    })
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code ?? ''
    const message = (error as { message?: string })?.message ?? 'Erreur inconnue'

    console.error('[api/auth/google] Token verification failed:', code, message)

    if (code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expiré. Reconnectez-vous.' }, { status: 401 })
    }
    if (code === 'auth/id-token-revoked') {
      return NextResponse.json({ error: 'Session révoquée.' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Méthode non autorisée' }, { status: 405 })
}
