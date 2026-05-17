import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/auth/verify-email
 *
 * Called client-side when user.emailVerified === true and the Firestore
 * user doc still has emailVerificationPending: true.
 *
 * Sets:
 *   users/{uid}           → activated: true, active: true, emailVerificationPending: false
 *   team_accesses/{doc}   → activated: true, status: 'active'
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let uid: string
    let email: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      // Double-check emailVerified from the token
      if (!decoded.email_verified) {
        return NextResponse.json(
          { message: 'Email non encore vérifié. Vérifiez votre boîte de réception.' },
          { status: 403 }
        )
      }
      uid = decoded.uid
      email = decoded.email ?? ''
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // ── 1. Update users document ───────────────────────────────────────────
    const userRef = adminDb.collection('users').doc(uid)
    const userSnap = await userRef.get()

    if (!userSnap.exists) {
      return NextResponse.json({ message: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const userData = userSnap.data()!
    if (userData.activated === true && !userData.emailVerificationPending) {
      // Already activated — idempotent OK
      return NextResponse.json({ success: true, alreadyActivated: true })
    }

    await userRef.update({
      activated: true,
      active: true,
      emailVerificationPending: false,
      emailVerified: true,
      activatedAt: new Date()
    })

    // ── 2. Update team_accesses document ──────────────────────────────────
    const collections = ['team_accesses', 'teamAccesses', 'accesses'] as const
    for (const col of collections) {
      const snap = await adminDb.collection(col).where('firebaseUid', '==', uid).limit(1).get()
      if (!snap.empty) {
        await snap.docs[0]!.ref.update({
          activated: true,
          status: 'active',
          activatedAt: new Date(),
          emailVerificationPending: false
        })
        break
      }
    }

    console.log('[auth/verify-email] Activation finalized', { uid, email })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/verify-email]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
