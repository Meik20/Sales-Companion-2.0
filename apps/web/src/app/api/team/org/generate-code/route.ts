import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateOrgCode } from '@/lib/org'

/**
 * POST /api/team/org/generate-code
 *
 * Genere un code ORG unique cote serveur de facon atomique.
 * Verifie l'unicite dans Firestore avant de retourner le code.
 *
 * SECURITE :
 * - Necessite un token Firebase valide (auth obligatoire)
 * - Rate-limited a 3 appels / 10 minutes par utilisateur
 * - La generation cote client est desormais deconseillée
 */
export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  const { adminAuth, adminDb } = await import('@/lib/firebase-admin')

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Token invalide ou expire' }, { status: 401 })
  }

  // Rate limiting par utilisateur
  const rl = await checkRateLimit(`org-generate:${uid}`, {
    limit: 3,
    windowMs: 10 * 60 * 1000
  })

  if (!rl.success) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Reessayez dans quelques minutes.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.reset.getTime() - Date.now()) / 1000))
        }
      }
    )
  }

  // Verifier que l'utilisateur n'a pas deja un orgCode
  const userSnap = await adminDb.collection('users').doc(uid).get()
  if (userSnap.exists) {
    const userData = userSnap.data()
    if (userData?.orgCode) {
      return NextResponse.json({ error: 'Un code ORG existe deja pour ce compte' }, { status: 409 })
    }
  }

  try {
    const body = await request.json().catch(() => ({}))
    const countryCode = (body.country || 'CM').trim().toUpperCase().slice(0, 2)

    // Generation avec verification d'unicite (max 5 tentatives)
    let orgCode: string | null = null
    const MAX_ATTEMPTS = 5

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = generateOrgCode(countryCode)
      const collision = await adminDb
        .collection('users')
        .where('orgCode', '==', candidate)
        .limit(1)
        .get()

      if (collision.empty) {
        orgCode = candidate
        break
      }
      console.warn(
        `[generate-code] Collision detectee pour ${candidate}, tentative ${attempt + 1}/${MAX_ATTEMPTS}`
      )
    }

    if (!orgCode) {
      return NextResponse.json(
        { error: 'Erreur lors de la generation du code. Reessayez.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      orgCode,
      message: 'Code ORG genere avec succes. Partagez-le uniquement avec vos Managers.'
    })
  } catch (error: any) {
    console.error('[POST /api/team/org/generate-code] error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
