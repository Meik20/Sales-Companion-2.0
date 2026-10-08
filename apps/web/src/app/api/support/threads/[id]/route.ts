import { NextRequest, NextResponse } from 'next/server'
import { verifyRequestUser, getFirebaseAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await verifyRequestUser(request)
    if ('error' in auth) return auth.error

    const { adminDb, adminAuth } = await getFirebaseAdmin()

    // Vérifier si l'utilisateur est admin
    let isAdmin = false
    try {
      const userRecord = await adminAuth.getUser(auth.user.uid)
      isAdmin = userRecord.customClaims?.role === 'admin'
      if (!isAdmin) {
        const userDoc = await adminDb.collection('users').doc(auth.user.uid).get()
        isAdmin = userDoc.data()?.role === 'admin'
      }
    } catch {
      isAdmin = false
    }

    const threadDoc = await adminDb.collection('support_threads').doc(id).get()
    if (!threadDoc.exists) {
      return NextResponse.json({ message: 'Ticket introuvable' }, { status: 404 })
    }

    const threadData = threadDoc.data()
    if (!isAdmin && threadData?.userId !== auth.user.uid) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const messagesSnap = await adminDb
      .collection('support_threads')
      .doc(id)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get()

    const messages = messagesSnap.docs.map((d) => {
      const mData = d.data()
      return {
        id: d.id,
        ...mData,
        createdAt: mData.createdAt?.toDate?.()?.toISOString() ?? null
      }
    })

    return NextResponse.json({
      id: threadDoc.id,
      ...threadData,
      createdAt: threadData?.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: threadData?.updatedAt?.toDate?.()?.toISOString() ?? null,
      messages
    })
  } catch (error) {
    console.error('Support thread detail error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
