import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

/**
 * POST /api/support/messages/delete
 * Supprime un message spécifique d'un fil de support pour l'utilisateur ou l'admin.
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
    const { threadId, messageId } = body

    if (!threadId || typeof threadId !== 'string' || !messageId || typeof messageId !== 'string') {
      return NextResponse.json({ error: 'threadId et messageId requis.' }, { status: 400 })
    }

    const threadRef = adminDb.collection('support_threads').doc(threadId)
    const threadSnap = await threadRef.get()

    if (!threadSnap.exists) {
      return NextResponse.json({ error: 'Ticket introuvable.' }, { status: 404 })
    }

    const threadData = threadSnap.data() || {}

    // Vérifier rôle admin
    let isAdmin = decoded.role === 'admin'
    if (!isAdmin) {
      const userDoc = await adminDb.collection('users').doc(decoded.uid).get()
      isAdmin = userDoc.data()?.role === 'admin'
    }

    // Vérifier appartenance
    const isOwner =
      threadData.userId === decoded.uid ||
      (decoded.email && threadData.userEmail && decoded.email.toLowerCase() === threadData.userEmail.toLowerCase())

    const messageRef = threadRef.collection('messages').doc(messageId)
    const messageSnap = await messageRef.get()

    if (!messageSnap.exists) {
      return NextResponse.json({ success: true, message: 'Message déjà supprimé.' })
    }

    const messageData = messageSnap.data() || {}
    const isSender = messageData.senderId === decoded.uid

    if (!isAdmin && !isOwner && !isSender) {
      return NextResponse.json({ error: 'Permission refusée pour supprimer ce message.' }, { status: 403 })
    }

    await messageRef.delete()

    // Recalculer le dernier message
    try {
      const remaining = await threadRef
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()

      if (!remaining.empty) {
        const lastMsgData = remaining.docs[0]?.data()
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
      // Non critique
    }

    return NextResponse.json({ success: true, message: 'Message supprimé avec succès.' })
  } catch (error: any) {
    console.error('Erreur API suppression message:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression du message.' }, { status: 500 })
  }
}
