import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const ACCESS_COLLECTIONS = ['team_accesses', 'teamAccesses', 'accesses'] as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accessId: string }> }
) {
  try {
    const { accessId: rawAccessId } = await params

    if (!rawAccessId) {
      return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
    }

    const accessIdRaw = rawAccessId.trim()
    let accessDoc: FirebaseFirestore.DocumentData | null = null
    let actualAccessId = ''

    for (const col of ACCESS_COLLECTIONS) {
      // 1. Chercher par document ID exact
      let snap = await adminDb.collection(col).doc(accessIdRaw).get()
      if (snap.exists) {
        accessDoc = snap.data()!
        actualAccessId = accessDoc.accessId || accessIdRaw
        break
      }

      // 2. Chercher par magicCode (Nouveau système Magic Link)
      const byMagicCode = await adminDb.collection(col).where('magicCode', '==', accessIdRaw).limit(1).get()
      if (!byMagicCode.empty && byMagicCode.docs[0]) {
        accessDoc = byMagicCode.docs[0].data()
        actualAccessId = accessDoc?.accessId || ''
        break
      }

      // 3. Chercher par accessId (Ancien système)
      const byAccessId = await adminDb.collection(col).where('accessId', '==', accessIdRaw.toLowerCase()).limit(1).get()
      if (!byAccessId.empty && byAccessId.docs[0]) {
        accessDoc = byAccessId.docs[0].data()
        actualAccessId = accessDoc?.accessId || ''
        break
      }
    }

    if (!accessDoc) {
      return NextResponse.json({ error: "Lien d'activation invalide ou expiré." }, { status: 404 })
    }

    // Si le compte est déjà activé
    if (accessDoc?.activated === true || accessDoc?.status === 'active') {
      return NextResponse.json(
        { error: 'Ce compte a déjà été activé. Connectez-vous directement.' },
        { status: 409 }
      )
    }

    if (accessDoc?.status === 'revoked') {
      return NextResponse.json(
        { error: 'Cet accès a été révoqué. Contactez votre manager.' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      accessId: actualAccessId,
      firstname: accessDoc.firstname ?? accessDoc.firstName ?? '',
      lastname: accessDoc.lastname ?? accessDoc.lastName ?? '',
      company: accessDoc.company ?? '',
      status: accessDoc.status ?? 'pending',
      email: accessDoc.email ?? null
    })
  } catch (error) {
    console.error('[access-info] Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
