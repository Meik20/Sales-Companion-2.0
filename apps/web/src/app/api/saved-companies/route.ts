import { NextRequest, NextResponse } from 'next/server'

async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/saved-companies
 * Récupère les entreprises sauvegardées de l'utilisateur.
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdminModules()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let userId: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userId = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const snapshot = await adminDb.collection('saved_companies').where('userId', '==', userId).get()

    const docs = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        userId: data.userId,
        companyId: data.companyId,
        companyName: data.raisonSociale || '',
        metadata: {
          sector: data.sector,
          city: data.city,
          region: data.region,
          telephone: data.telephone,
          email: data.email
        },
        savedAt: data.savedAt?.toDate?.()?.toISOString() ?? null
      }
    })

    // Sort by savedAt desc in memory to avoid missing Firestore index errors
    docs.sort((a, b) => {
      if (!a.savedAt) return 1
      if (!b.savedAt) return -1
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    })

    return NextResponse.json({ companies: docs })
  } catch (error) {
    console.error('[saved-companies/GET] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/saved-companies
 * Sauvegarde une entreprise pour l'utilisateur.
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdminModules()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let userId: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      userId = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { companyId, raisonSociale, sector, region, city, telephone, email } = body as {
      companyId?: string
      raisonSociale?: string
      sector?: string
      region?: string
      city?: string
      telephone?: string
      email?: string
    }

    if (!raisonSociale) {
      return NextResponse.json({ message: 'raisonSociale est requis' }, { status: 400 })
    }

    // Avoid duplicates: check if already saved
    const existing = await adminDb
      .collection('saved_companies')
      .where('userId', '==', userId)
      .where('companyId', '==', companyId ?? raisonSociale)
      .get()

    if (!existing.empty) {
      return NextResponse.json({ success: true, id: existing.docs[0]!.id, duplicate: true })
    }

    const docRef = await adminDb.collection('saved_companies').add({
      userId,
      companyId: companyId ?? null,
      raisonSociale,
      sector: sector ?? null,
      region: region ?? null,
      city: city ?? null,
      telephone: telephone ?? null,
      email: email ?? null,
      savedAt: new Date()
    })

    return NextResponse.json({ success: true, id: docRef.id })
  } catch (error) {
    console.error('[saved-companies/POST] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
