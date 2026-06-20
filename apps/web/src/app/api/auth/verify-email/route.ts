import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, checkRateLimit } from '@/lib/rate-limit'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  const { createAdminNotification } = await import('@/lib/admin-notifications')
  return { adminDb, adminAuth, createAdminNotification }
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
    const ip = getClientIp(request)
    const ipLimit = await checkRateLimit(ip, { limit: 10, windowMs: 60 * 1000 })
    if (!ipLimit.success) {
      return NextResponse.json({ message: 'Trop de tentatives, veuillez réessayer plus tard.' }, { status: 429 })
    }

    const { adminDb, adminAuth, createAdminNotification } = await getAdmin()

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

    // ✅ Les managers NE doivent PAS être activés à la vérification email.
    // Leur active=true viendra uniquement de l'admin via /api/admin/payments/[reference].
    // Pour les autres rôles (independent, member), on active immédiatement.
    const isManager = userData.role === 'manager'

    await userRef.update({
      ...(isManager
        ? {
            // Manager : on vérifie l'email mais on n'active PAS encore
            emailVerificationPending: false,
            emailVerified: true,
            updatedAt: new Date()
          }
        : {
            // Autres rôles : activation complète
            activated: true,
            active: true,
            emailVerificationPending: false,
            emailVerified: true,
            activatedAt: new Date(),
            updatedAt: new Date()
          })
    })

    // ✅ Notification admin quand un manager vérifie son email
    // (il va bientôt soumettre un paiement — l'admin peut anticiper)
    if (isManager) {
      await createAdminNotification({
        type: 'new_manager',
        title: 'Nouveau Manager inscrit',
        message: `${email} a vérifié son email et est en attente de choix de plan. Un paiement devrait arriver prochainement.`,
        userId: uid,
        userEmail: email,
        link: '/admin/users'
      })
    }

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
