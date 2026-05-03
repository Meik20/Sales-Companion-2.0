import { NextRequest, NextResponse } from 'next/server'

async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/saved-searches
 * Récupère les recherches sauvegardées de l'utilisateur.
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

    const snapshot = await adminDb
      .collection('saved_searches')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
    }))

    return NextResponse.json(items)
  } catch (error) {
    console.error('[saved-searches/GET] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/saved-searches
 * Sauvegarde une recherche pour l'utilisateur.
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
    const { label, filters, resultCount } = body as {
      label?: string
      filters?: Record<string, unknown>
      resultCount?: number
    }

    if (!label || !filters) {
      return NextResponse.json({ message: 'label et filters sont requis' }, { status: 400 })
    }

    const docRef = await adminDb.collection('saved_searches').add({
      userId,
      label,
      filters,
      resultCount: resultCount ?? 0,
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true, id: docRef.id })
  } catch (error) {
    console.error('[saved-searches/POST] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
