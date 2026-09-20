import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/support/delete-message
 * Supprime un message spécifique d'un ticket support.
 * Réservé aux administrateurs.
 */
export async function POST(request: NextRequest) {
  try {
    const tokenHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdminCached(tokenHeader)

    const body = await request.json()
    const { threadId, messageId } = body

    if (!threadId || typeof threadId !== 'string' || !messageId || typeof messageId !== 'string') {
      return NextResponse.json({ error: 'threadId et messageId requis.' }, { status: 400 })
    }

    const threadRef = adminDb.collection('support_threads').doc(threadId)
    const messageRef = threadRef.collection('messages').doc(messageId)

    await messageRef.delete()

    // Mettre à jour lastMessage avec le dernier message restant (s'il existe)
    try {
      const remainingMessages = await threadRef
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()

      if (!remainingMessages.empty) {
        const lastMsgData = remainingMessages.docs[0]?.data()
        await threadRef.update({
          lastMessage: (lastMsgData?.content || '').slice(0, 80),
          updatedAt: lastMsgData?.createdAt || FieldValue.serverTimestamp()
        })
      } else {
        await threadRef.update({
          lastMessage: ''
        })
      }
    } catch {
      // Non critique si l'index ou la mise à jour du résumé échoue
    }

    return NextResponse.json({ success: true, message: 'Message supprimé avec succès.' })
  } catch (error: any) {
    if (error?.message === 'unauthenticated') {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }
    if (error?.message === 'forbidden') {
      return NextResponse.json({ error: 'Accès interdit.' }, { status: 403 })
    }
    console.error('Erreur suppression message support:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression du message.' }, { status: 500 })
  }
}
