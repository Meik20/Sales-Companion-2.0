import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/validate-exemption?token=...&email=...
 * Vérifie si un jeton de dérogation est valide et actif pour un email donné.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token') || searchParams.get('exemption')
    const email = searchParams.get('email')

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Jeton manquant' }, { status: 400 })
    }

    const docRef = adminDb.collection('domain_exemptions').doc(token)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return NextResponse.json({ valid: false, error: 'Jeton de dérogation invalide' }, { status: 404 })
    }

    const data = docSnap.data()!

    // Vérifier si le jeton a déjà été utilisé
    if (data.used || data.status === 'consumed') {
      return NextResponse.json(
        { valid: false, error: 'Ce lien d’inscription a déjà été utilisé.' },
        { status: 400 }
      )
    }

    // Vérifier l'expiration
    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { valid: false, error: 'Ce lien d’inscription a expiré (validité 7 jours).' },
        { status: 400 }
      )
    }

    // Vérifier la correspondance de l'email si fourni
    if (email && data.email && data.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
      return NextResponse.json(
        { valid: false, error: 'Ce jeton n’est pas associé à cette adresse email.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      exemption: {
        email: data.email,
        name: data.name,
        companyName: data.companyName,
        sector: data.sector
      }
    })
  } catch (error) {
    console.error('[validate-exemption GET]', error)
    return NextResponse.json(
      { valid: false, error: 'Erreur lors de la validation du jeton' },
      { status: 500 }
    )
  }
}
