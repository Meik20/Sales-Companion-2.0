import { NextRequest, NextResponse } from 'next/server'

async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * DELETE /api/saved-companies/[id]
 * Supprime une entreprise sauvegardée.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const docRef = adminDb.collection('saved_companies').doc(params.id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ message: 'Introuvable' }, { status: 404 })
    }

    if (doc.data()?.userId !== userId) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    await docRef.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[saved-companies/DELETE] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
