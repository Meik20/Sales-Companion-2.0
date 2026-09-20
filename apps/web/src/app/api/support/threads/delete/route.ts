import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/support/threads/delete
 * Supprime un ticket de support et ses messages.
 * Autorisé si l'utilisateur est le créateur du ticket (par userId ou email) ou admin.
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
      return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })
    }

    const body = await request.json()
    const { threadId } = body

    if (!threadId || typeof threadId !== 'string') {
      return NextResponse.json({ error: 'threadId requis.' }, { status: 400 })
    }

    const threadRef = adminDb.collection('support_threads').doc(threadId)
    const threadSnap = await threadRef.get()

    if (!threadSnap.exists) {
      return NextResponse.json({ success: true, message: 'Ticket déjà supprimé.' })
    }

    const threadData = threadSnap.data() || {}

    // Vérifier si l'utilisateur est admin
    let isAdmin = decoded.role === 'admin'
    if (!isAdmin) {
      const userDoc = await adminDb.collection('users').doc(decoded.uid).get()
      isAdmin = userDoc.data()?.role === 'admin'
    }

    // Vérifier les droits : propriétaire (userId ou email) ou admin
    const isOwner =
      threadData.userId === decoded.uid ||
      (decoded.email && threadData.userEmail && decoded.email.toLowerCase() === threadData.userEmail.toLowerCase())

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Permission refusée pour supprimer ce ticket.' }, { status: 403 })
    }

    // Supprimer tous les messages associés
    const messagesSnap = await threadRef.collection('messages').get()
    const batch = adminDb.batch()
    messagesSnap.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })
    batch.delete(threadRef)

    await batch.commit()

    return NextResponse.json({ success: true, message: 'Ticket et messages supprimés avec succès.' })
  } catch (error: any) {
    console.error('Erreur API suppression thread support:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la suppression du ticket.' },
      { status: 500 }
    )
  }
}
