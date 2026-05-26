import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  const { FieldValue } = await import('firebase-admin/firestore')
  return { adminDb, adminAuth, FieldValue }
}

export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth, FieldValue } = await getAdmin()

    // 1. Authentification
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    let managerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      managerUid = decoded.uid
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // 2. Body parsing
    const { accessId } = await request.json()
    if (!accessId) {
      return NextResponse.json({ error: 'accessId manquant' }, { status: 400 })
    }

    // 3. Vérification de propriété
    const accessRef = adminDb.collection('team_accesses').doc(accessId)
    const accessDoc = await accessRef.get()

    if (!accessDoc.exists) {
      return NextResponse.json({ error: 'Accès introuvable' }, { status: 404 })
    }

    const accessData = accessDoc.data()!
    if (accessData.managerUid !== managerUid) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // 4. Révocation de l'accès (Mise à jour du statut)
    await accessRef.update({
      status: 'revoked',
      revokedAt: FieldValue.serverTimestamp()
    })

    // 5. Si le membre est actif, le détacher de l'équipe
    const memberFirebaseUid = accessData.firebaseUid
    if (memberFirebaseUid) {
      try {
        await adminDb.collection('users').doc(memberFirebaseUid).update({
          managerUid: null,
          role: 'independent'
        })
        // Désactiver son compte Auth également pour forcer la reconnexion/blocage
        await adminAuth.updateUser(memberFirebaseUid, { disabled: true })
      } catch (err) {
        console.error('[revoke API] erreur lors du détachement utilisateur:', err)
      }
    }

    return NextResponse.json({ success: true, message: 'Accès révoqué avec succès' })
  } catch (error: any) {
    console.error('[revoke API] erreur:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
