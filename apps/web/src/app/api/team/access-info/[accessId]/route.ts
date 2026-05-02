import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accessId: string }> }
) {
  try {
    const { accessId } = await params

    if (!accessId) {
      return NextResponse.json({ error: 'accessId manquant' }, { status: 400 })
    }

    // Try teamAccesses collection first, then accesses
    let snap = await adminDb.collection('teamAccesses').doc(accessId).get()
    if (!snap.exists) {
      snap = await adminDb.collection('accesses').doc(accessId).get()
    }
    if (!snap.exists) {
      return NextResponse.json({ error: 'Lien d\'activation invalide ou expiré' }, { status: 404 })
    }

    const data = snap.data()!
    if (data.status === 'activated') {
      return NextResponse.json({ error: 'Ce compte a déjà été activé. Connectez-vous directement.' }, { status: 409 })
    }

    // Return only public info
    return NextResponse.json({
      accessId,
      accessLabel: data.accessLabel ?? accessId,
      firstname: data.firstname ?? data.firstName ?? '',
      lastname: data.lastname ?? data.lastName ?? '',
      company: data.company ?? '',
      status: data.status ?? 'pending',
      email: data.email ?? null,
    })
  } catch (error) {
    console.error('Access info error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
