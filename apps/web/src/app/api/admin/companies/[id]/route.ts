export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'

async function verifyAdmin(token: string | null) {
  if (!token) throw new Error('unauthenticated')
  const decoded = await adminAuth.verifyIdToken(token)
  const callerDoc = await adminDb.collection('users').doc(decoded.uid).get()
  if (callerDoc.data()?.role !== 'admin') throw new Error('forbidden')
  return decoded
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdmin(token)

    const { id } = await params
    await adminDb.collection('companies').doc(id).delete()

    return NextResponse.json({ success: true, id })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (msg === 'forbidden') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    console.error('Delete company error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
