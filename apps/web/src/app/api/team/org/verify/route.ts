import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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
    const snap = await adminDb
      .collection('users')
      .where('orgCode', '==', code)
      .where('role', '==', 'manager')
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.json(
        {
          valid: false,
          error: `Aucune organisation trouvée avec le code "${code}". Vérifiez le code partagé par votre Senior Manager.`
        },
        { status: 404 }
      )
    }

    const data = snap.docs[0]!.data()
    return NextResponse.json({
      valid: true,
      orgCode: code,
      companyName: data.companyName || data.company || 'Organisation',
      sector: data.sector || null,
      country: data.country || 'CM',
      seniorManagerName: data.displayName || data.name || null
    })
  } catch (error: any) {
    console.error('[GET /api/team/org/verify] error:', error)
    return NextResponse.json(
      { valid: false, error: error.message || 'Erreur lors de la vérification' },
      { status: 500 }
    )
  }
}
