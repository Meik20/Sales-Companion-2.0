export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    }

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // Récupérer les 60 dernières notifications de l'utilisateur
    const snap = await adminDb
      .collection('userNotifications')
      .where('userId', '==', callerUid)
      .limit(60)
      .get()

    const notifications = snap.docs.map((docSnap) => {
      const data = docSnap.data()
      let createdAtStr = new Date().toISOString()
      if (data.createdAt?.toDate) {
        createdAtStr = data.createdAt.toDate().toISOString()
      } else if (typeof data.createdAt === 'string') {
        createdAtStr = data.createdAt
      }

      return {
        id: docSnap.id,
        userId: data.userId,
        type: data.type || 'general',
        title: data.title || 'Notification',
        message: data.message || '',
        link: data.link || '/pipeline',
        read: Boolean(data.read),
        createdAt: createdAtStr,
        metadata: data.metadata || {}
      }
    })

    // Tri décroissant par date de création
    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('[GET /api/notifications] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    }

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { id, all } = body as { id?: string; all?: boolean }
    const nowIso = new Date().toISOString()

    if (all) {
      // Marquer toutes les notifications non lues comme lues
      const snap = await adminDb
        .collection('userNotifications')
        .where('userId', '==', callerUid)
        .where('read', '==', false)
        .get()

      if (!snap.empty) {
        const batch = adminDb.batch()
        snap.docs.forEach((d) => {
          batch.update(d.ref, { read: true, readAt: nowIso })
        })
        await batch.commit()
      }
      return NextResponse.json({ success: true, count: snap.size })
    }

    if (id) {
      const docRef = adminDb.collection('userNotifications').doc(id)
      const docSnap = await docRef.get()
      if (!docSnap.exists) {
        return NextResponse.json({ message: 'Notification introuvable' }, { status: 404 })
      }
      if (docSnap.data()?.userId !== callerUid) {
        return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
      }
      await docRef.update({ read: true, readAt: nowIso })
      return NextResponse.json({ success: true, id })
    }

    return NextResponse.json({ message: 'id ou all requis' }, { status: 400 })
  } catch (error) {
    console.error('[PATCH /api/notifications] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
