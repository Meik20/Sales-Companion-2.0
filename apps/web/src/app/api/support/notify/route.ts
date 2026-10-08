import { NextRequest, NextResponse } from 'next/server'
import { createAdminNotification } from '@/lib/admin-notifications'
import { checkRateLimitByUser } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/support/notify
 * Déclenche une notification admin lors de la création d'un nouveau ticket support par un utilisateur authentifié.
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const rl = await checkRateLimitByUser(callerUid, { limit: 10, windowMs: 10 * 60 * 1000 })
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const { threadId, subject, userName, userEmail } = body as {
      threadId?: string
      subject?: string
      userName?: string
      userEmail?: string
    }

    if (!threadId || !subject) {
      return NextResponse.json({ error: 'threadId et subject requis' }, { status: 400 })
    }

    // Vérifier que le thread existe et appartient bien à l'utilisateur authentifié
    const threadSnap = await adminDb.collection('support_threads').doc(threadId).get()
    if (!threadSnap.exists) {
      return NextResponse.json({ error: 'Thread introuvable' }, { status: 404 })
    }

    const threadData = threadSnap.data()
    if (threadData?.userId !== callerUid) {
      return NextResponse.json({ error: 'Accès non autorisé à ce thread' }, { status: 403 })
    }

    await createAdminNotification({
      type: 'support_ticket',
      title: '🎧 Nouveau ticket support',
      message: `${userName || threadData.userName || userEmail || 'Utilisateur'} : ${subject.slice(0, 150)}`,
      userId: callerUid,
      userEmail: userEmail || threadData.userEmail || '',
      reference: threadId,
      link: '/admin/support'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[support/notify POST]', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
