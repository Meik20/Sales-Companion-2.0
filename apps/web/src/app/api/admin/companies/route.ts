export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const callerDoc = await adminDb.collection('users').doc(decoded.uid).get()
    if (callerDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20', 10)

    const totalSnap = await adminDb.collection('companies').count().get()
    const total = totalSnap.data().count

    const snap = await adminDb
      .collection('companies')
      .orderBy('createdAt', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .get()

    const companies = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    return NextResponse.json({ items: companies, total, page, pageSize })
  } catch (error) {
    console.error('Companies error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function deleteAllCompanies() {
  const batchSize = 500

  while (true) {
    const snapshot = await adminDb.collection('companies').limit(batchSize).get()
    if (snapshot.empty) {
      break
    }

    const batch = adminDb.batch()
    snapshot.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const callerDoc = await adminDb.collection('users').doc(decoded.uid).get()
    if (callerDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await deleteAllCompanies()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete all companies error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

