export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'

async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

export async function GET(
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

    const doc = await adminDb.collection('pipeline').doc(id).get()
    if (!doc.exists) return NextResponse.json({ message: 'Non trouvé' }, { status: 404 })

    const data = doc.data()
    if (data?.userId !== userId && data?.managerUid !== userId) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    return NextResponse.json({ id: doc.id, ...data })
  } catch (error) {
    console.error('[pipeline/[id]/GET] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
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

    const doc = await adminDb.collection('pipeline').doc(id).get()
    if (!doc.exists) return NextResponse.json({ message: 'Non trouvé' }, { status: 404 })

    const data = doc.data()
    if (data?.userId !== userId && data?.managerUid !== userId) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    await doc.ref.update({ ...body, updatedAt: new Date() })

    const updated = await doc.ref.get()
    return NextResponse.json({ id: updated.id, ...updated.data() })
  } catch (error) {
    console.error('[pipeline/[id]/PUT] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

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

    const doc = await adminDb.collection('pipeline').doc(id).get()
    if (!doc.exists) return NextResponse.json({ message: 'Non trouvé' }, { status: 404 })

    const data = doc.data()
    if (data?.userId !== userId && data?.managerUid !== userId) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    await doc.ref.delete()
    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[pipeline/[id]/DELETE] Error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
