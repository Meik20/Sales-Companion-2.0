import { NextRequest, NextResponse } from 'next/server'
import { verifyRequestUser, getFirebaseAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRequestUser(request)
    if ('error' in auth) return auth.error

    const { adminDb } = await getFirebaseAdmin()
    const snap = await adminDb
      .collection('team_accesses')
      .where('managerUid', '==', auth.user.uid)
      .get()

    const members = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null
    }))

    return NextResponse.json(members)
  } catch (error) {
    console.error('Team members error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
