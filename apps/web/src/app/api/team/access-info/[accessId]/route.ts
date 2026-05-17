import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const ACCESS_COLLECTIONS = ['team_accesses', 'teamAccesses', 'accesses'] as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accessId: string }> }
) {
  try {
    const { accessId } = await params

    if (!accessId) {
      return NextResponse.json({ error: 'accessId manquant' }, { status: 400 })
    }

    // Search all known collections
    let snap: FirebaseFirestore.DocumentSnapshot | null = null
    for (const col of ACCESS_COLLECTIONS) {
      const s = await adminDb.collection(col).doc(accessId).get()
      if (s.exists) {
        snap = s
        break
      }
    }

    if (!snap || !snap.exists) {
      return NextResponse.json({ error: "Lien d'activation invalide ou expiré." }, { status: 404 })
    }

    const data = snap.data()!

    // Account is already active if either flag is set
    if (data.activated === true || data.status === 'active') {
      return NextResponse.json(
        { error: 'Ce compte a déjà été activé. Connectez-vous directement.' },
        { status: 409 }
      )
    }

    if (data.status === 'revoked') {
      return NextResponse.json(
        { error: 'Cet accès a été révoqué. Contactez votre manager.' },
        { status: 403 }
      )
    }

    // Return only the public info needed by the form
    return NextResponse.json({
      accessId,
      accessLabel: data.accessLabel ?? accessId,
      firstname: data.firstname ?? data.firstName ?? '',
      lastname: data.lastname ?? data.lastName ?? '',
      company: data.company ?? '',
      status: data.status ?? 'pending',
      email: data.email ?? null
    })
  } catch (error) {
    console.error('[access-info] Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
