export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getFirebaseAdmin, verifyRequestUser } from '@/lib/api-auth'

/** POST /api/support/threads/[id]/messages — réponse utilisateur */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRequestUser(request)
    if ('error' in auth) return auth.error

    const { id } = await params
    const body = await request.json()
    const content = String(body.message ?? body.content ?? '').trim()

    if (!content) {
      return NextResponse.json({ message: 'Message vide' }, { status: 400 })
    }

    const { adminDb } = await getFirebaseAdmin()
    const threadRef = adminDb.collection('support_threads').doc(id)
    const threadDoc = await threadRef.get()

    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
    }

    if (threadDoc.data()?.userId !== auth.user.uid) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const messageRef = threadRef.collection('messages').doc()
    await messageRef.set({
      senderId: auth.user.uid,
      senderRole: 'user',
      content,
      createdAt: FieldValue.serverTimestamp()
    })

    await threadRef.update({
      lastMessage: content,
      unreadByUser: false,
      unreadByAdmin: true,
      updatedAt: FieldValue.serverTimestamp()
    })

    return NextResponse.json({ ok: true, id: messageRef.id }, { status: 201 })
  } catch (error) {
    console.error('[support/threads/[id]/messages POST]', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
