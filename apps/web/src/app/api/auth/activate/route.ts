import { NextRequest, NextResponse } from 'next/server'

// Lazy import to avoid HTML errors if firebase-admin fails to initialise
async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/** Collections to search, in priority order (most recently used first) */
const ACCESS_COLLECTIONS = ['team_accesses', 'teamAccesses', 'accesses'] as const

export async function POST(request: NextRequest) {
  // Always return JSON — never let Next.js emit an HTML error page
  try {
    const { adminDb, adminAuth } = await getAdminModules()

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps de requête invalide' }, { status: 400 })
    }

    const { accessId, email: bodyEmail, password } = body as {
      accessId?: string
      email?: string
      password?: string
    }

    // ── Validate required fields ────────────────────────────────────────────
    if (!accessId?.trim()) {
      return NextResponse.json({ message: "L'identifiant d'accès est requis." }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { message: 'Le mot de passe doit comporter au moins 6 caractères.' },
        { status: 400 }
      )
    }

    const requestedEmail = bodyEmail?.trim().toLowerCase()

    // ── 1. Find the access document across all known collections ─────────────
    let snap: FirebaseFirestore.DocumentSnapshot | null = null
    let foundCollection = ''

    for (const col of ACCESS_COLLECTIONS) {
      const s = await adminDb.collection(col).doc(accessId.trim()).get()
      if (s.exists) {
        snap = s
        foundCollection = col
        break
      }
    }

    if (!snap || !snap.exists) {
      return NextResponse.json(
        {
          message:
            "Lien d'activation invalide ou expiré. Vérifiez l'identifiant fourni par votre manager ou demandez un nouveau lien.",
        },
        { status: 404 }
      )
    }

    const data = snap.data()!

    const email = requestedEmail ?? data.email?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json(
        {
          message:
            "Aucun email fourni. Ce lien d'activation doit être associé à une adresse email ou vous devez en saisir une.",
        },
        { status: 400 }
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: "Format d'adresse email invalide. Vérifiez votre adresse." },
        { status: 400 }
      )
    }

    // ── 2. Guard: already activated ─────────────────────────────────────────
    if (data.activated === true || data.status === 'active') {
      return NextResponse.json(
        {
          message:
            'Ce compte a déjà été activé. Connectez-vous directement avec votre adresse email et votre mot de passe.',
        },
        { status: 409 }
      )
    }

    // ── 3. Guard: revoked ───────────────────────────────────────────────────
    if (data.status === 'revoked') {
      return NextResponse.json(
        {
          message:
            "Cet accès a été révoqué par votre manager. Contactez-le pour obtenir un nouveau lien.",
        },
        { status: 403 }
      )
    }

    console.log('[auth/activate] Activation started', { accessId, email, collection: foundCollection })

    // ── 4. Create or update Firebase Auth user ──────────────────────────────
    let uid: string
    try {
      const existing = await adminAuth.getUserByEmail(email)
      await adminAuth.updateUser(existing.uid, { password })
      uid = existing.uid
      console.log('[auth/activate] Updated existing Auth user', { uid, email })
    } catch (authErr: unknown) {
      const code = (authErr as { code?: string })?.code
      if (code === 'auth/user-not-found') {
        const newUser = await adminAuth.createUser({
          email,
          password,
          displayName: [
            data.firstname ?? data.firstName ?? '',
            data.lastname  ?? data.lastName  ?? '',
          ]
            .join(' ')
            .trim() || undefined,
        })
        uid = newUser.uid
        console.log('[auth/activate] Created new Auth user', { uid, email })
      } else {
        console.error('[auth/activate] Firebase Auth error', authErr)
        throw authErr
      }
    }

    // ── 5. Write / merge the users/{uid} document ───────────────────────────
    const userDocRef = adminDb.collection('users').doc(uid)
    const userDocSnap = await userDocRef.get()
    const createdAt = userDocSnap.exists ? userDocSnap.data()?.createdAt ?? new Date() : new Date()

    await userDocRef.set(
      {
        uid,
        email,
        name: [
          data.firstname ?? data.firstName ?? '',
          data.lastname  ?? data.lastName  ?? '',
        ]
          .join(' ')
          .trim() || null,
        role:       data.role      ?? 'member',
        plan:       data.plan      ?? 'free',
        active:     false,          // not active until email verified
        activated:  false,          // will be set true by /api/auth/verify-email
        emailVerificationPending: true,
        company:    data.company   ?? null,
        sector:     data.sector    ?? null,
        region:     data.region    ?? null,
        managerId:  data.managerId ?? data.managerUid ?? null,
        managerUid: data.managerUid ?? data.managerId ?? null,
        managerEmail: data.managerEmail ?? null,
        dailyUsed:  0,
        dailyLimit: data.dailyLimit ?? 10,
        createdAt,
        activatedAt: null,
      },
      { merge: true }
    )

    // ── 5.5. SET CUSTOM CLAIMS for Firestore rules ──────────────────────────
    const userRole = data.role ?? 'member'
    await adminAuth.setCustomUserClaims(uid, { role: userRole })

    // ── 6. Update the access document — pending verification ──────────────
    await adminDb.collection(foundCollection).doc(accessId.trim()).update({
      activated:               false,             // finalized after email verification
      emailVerificationPending: true,
      status:                  'pending_email',   // intermediate status
      email,
      firebaseUid:             uid,
      activatedAt:             null,
      activatedUid:            uid,
    })

    console.log('[auth/activate] Activation pending email verification', { accessId, email, uid, collection: foundCollection })

    return NextResponse.json({
      success: true,
      uid,
      requiresEmailVerification: true,
      message: 'Compte créé. Vérifiez votre email pour finaliser l\'activation.',
    })
  } catch (error) {
    console.error('[auth/activate] Unexpected error:', error)

    const msg =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Erreur serveur inconnue'

    return NextResponse.json(
      { message: `Activation impossible : ${msg}` },
      { status: 500 }
    )
  }
}

// Wrong method — return JSON, not HTML
export async function GET() {
  return NextResponse.json({ message: 'Méthode non autorisée' }, { status: 405 })
}
