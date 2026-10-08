import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * GET /api/team/org/verify?code=XXXXX
 *
 * Endpoint PUBLIC — vérifie si un code ORG existe.
 * RATE-LIMITED : 10 requêtes / 5 minutes par IP pour prévenir l'énumération
 * par force brute (charset ~32^5 ≈ 33M combinaisons).
 */
export async function GET(request: NextRequest) {
  // ── Rate limiting strict (endpoint public, pas d'auth) ──────────────────
  const ip = getClientIp(request)
  const rl = await checkRateLimit(`org-verify:${ip}`, {
    limit: 10,
    windowMs: 5 * 60 * 1000 // 10 tentatives par 5 minutes
  })

  if (!rl.success) {
    return NextResponse.json(
      { valid: false, error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.reset.getTime() - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rl.reset.toISOString()
        }
      }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')?.trim().toUpperCase()

    if (!code || code.length < 5) {
      return NextResponse.json(
        { valid: false, error: "Code d'organisation manquant ou trop court" },
        { status: 400 }
      )
    }

    const { adminDb } = await import('@/lib/firebase-admin')
    
    // 1. Chercher d'abord dans la collection organisations (clé primaire = orgCode)
    const orgDoc = await adminDb.collection('organisations').doc(code).get()
    if (orgDoc.exists) {
      const data = orgDoc.data()!
      return NextResponse.json({
        valid: true,
        orgCode: code,
        companyName: data.companyName || data.name || 'Organisation',
        sector: data.sector || null,
        country: data.country || 'CM'
      })
    }

    // 2. Fallback dans la collection users si l'organisation n'a pas encore de doc direct
    const snap = await adminDb
      .collection('users')
      .where('orgCode', '==', code)
      .where('role', '==', 'manager')
      .limit(1)
      .get()

    if (!snap.empty) {
      const data = snap.docs[0]!.data()
      return NextResponse.json({
        valid: true,
        orgCode: code,
        companyName: data.companyName || data.company || 'Organisation',
        sector: data.sector || null,
        country: data.country || 'CM'
      })
    }

    return NextResponse.json(
      {
        valid: false,
        error: `Aucune organisation trouvée avec le code "${code}". Vérifiez le code partagé par votre Senior Manager.`
      },
      { status: 404 }
    )
  } catch (error: any) {
    console.error('[GET /api/team/org/verify] error:', error)
    return NextResponse.json(
      { valid: false, error: error.message || 'Erreur lors de la vérification' },
      { status: 500 }
    )
  }
}

