export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminCached } from '@/lib/api-admin-auth'

async function verifyAdmin(token: string | null) {
  return verifyAdminCached(token)
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
