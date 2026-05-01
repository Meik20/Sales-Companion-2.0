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

    return NextResponse.json({ companies, total, page, pageSize })
  } catch (error) {
    console.error('Companies error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
