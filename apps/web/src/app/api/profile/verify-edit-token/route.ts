import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/profile/verify-edit-token
 * Vérifie si un jeton d'autorisation de modification de profil est valide et non expiré.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    if (!authHeader) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = await adminAuth.verifyIdToken(authHeader)
    } catch {
      return NextResponse.json({ error: 'Session invalide ou expirée.' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ valid: false, error: 'Token manquant.' }, { status: 400 })
    }

    const tokenDoc = await adminDb.collection('profile_edit_tokens').doc(token).get()

    if (!tokenDoc.exists) {
      return NextResponse.json({ valid: false, error: 'Jeton introuvable ou invalide.' }, { status: 404 })
    }

    const tokenData = tokenDoc.data() || {}

    // Vérifier l'appartenance
    if (tokenData.userId !== decoded.uid) {
      return NextResponse.json({ valid: false, error: 'Ce jeton ne correspond pas à votre compte.' }, { status: 403 })
    }

    // Vérifier l'expiration
    const expiresAt = tokenData.expiresAt?.toDate ? tokenData.expiresAt.toDate() : null
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ valid: false, error: 'Ce jeton d’autorisation a expiré (validité 24h).' }, { status: 410 })
    }

    return NextResponse.json({
      valid: true,
      expiresAt: expiresAt.toISOString(),
      message: 'Autorisation valide.'
    })
  } catch (error: any) {
    console.error('Erreur vérification edit-token:', error)
    return NextResponse.json({ valid: false, error: 'Erreur lors de la vérification.' }, { status: 500 })
  }
}
