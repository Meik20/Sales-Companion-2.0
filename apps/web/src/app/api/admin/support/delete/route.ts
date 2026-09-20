import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminCached } from '@/lib/api-admin-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/support/delete
 * Supprime définitivement un ticket support et tous ses messages associés.
 * Réservé aux administrateurs.
 */
export async function POST(request: NextRequest) {
  try {
    const tokenHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdminCached(tokenHeader)

    const body = await request.json()
    const { threadId } = body

    if (!threadId || typeof threadId !== 'string') {
      return NextResponse.json({ error: 'threadId requis.' }, { status: 400 })
    }

    const threadRef = adminDb.collection('support_threads').doc(threadId)
    const messagesSnap = await threadRef.collection('messages').get()

    // Supprimer tous les messages de la sous-collection par batch
    const batch = adminDb.batch()
    messagesSnap.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })
    batch.delete(threadRef)

    await batch.commit()

    return NextResponse.json({ success: true, message: 'Ticket supprimé avec succès.' })
  } catch (error: any) {
    if (error?.message === 'unauthenticated') {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }
    if (error?.message === 'forbidden') {
      return NextResponse.json({ error: 'Accès interdit.' }, { status: 403 })
    }
    console.error('Erreur suppression ticket support:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression du ticket.' }, { status: 500 })
  }
}
