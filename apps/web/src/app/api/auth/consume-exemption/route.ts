import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/consume-exemption
 * Marque un jeton d'exemption comme consommé après création réussie du compte.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, uid, email } = body

    if (!token) {
      return NextResponse.json({ error: 'Jeton manquant' }, { status: 400 })
    }

    const docRef = adminDb.collection('domain_exemptions').doc(token)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Jeton introuvable' }, { status: 404 })
    }

    await docRef.update({
      used: true,
      status: 'consumed',
      consumedAt: FieldValue.serverTimestamp(),
      consumedByUid: uid || null,
      consumedByEmail: email || null
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[consume-exemption POST]', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}
