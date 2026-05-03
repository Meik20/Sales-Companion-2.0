import { NextRequest, NextResponse } from 'next/server'

async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * DELETE /api/saved-searches/[id]
 * Supprime une recherche sauvegardée.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const doc = await adminDb.collection('saved_searches').doc(id).get()
    if (!doc.exists) return NextResponse.json({ message: 'Non trouvé' }, { status: 404 })

    if (doc.data()?.userId !== userId) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    await doc.ref.delete()
    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[saved-searches/[id]/DELETE] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
