import { NextRequest, NextResponse } from 'next/server'

// Lazy import pour éviter les erreurs HTML si firebase-admin ne s'initialise pas
async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdminModules()

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps de requête invalide' }, { status: 400 })
    }

    const { accessId, password } = body as { accessId?: string; password?: string }

    if (!accessId || !password) {
      return NextResponse.json({ message: 'accessId et password sont requis' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ message: 'Le mot de passe doit comporter au moins 6 caractères' }, { status: 400 })
    }

    // ── 1. Chercher le document d'accès (plusieurs collections possibles) ──
    let snap = await adminDb.collection('teamAccesses').doc(accessId).get()
    let col = 'teamAccesses'

    if (!snap.exists) {
      snap = await adminDb.collection('accesses').doc(accessId).get()
      col = 'accesses'
    }
    if (!snap.exists) {
      snap = await adminDb.collection('team_accesses').doc(accessId).get()
      if (snap.exists) col = 'team_accesses'
    }

    if (!snap.exists) {
      return NextResponse.json(
        {
          message:
            "Lien d'activation invalide ou expiré. Vérifiez l'identifiant d'accès fourni par votre manager ou demandez un nouveau lien.",
        },
        { status: 404 }
      )
    }

    const data = snap.data()!

    if (data.activated === true || data.status === 'activated' || data.status === 'active') {
      return NextResponse.json(
        {
          message:
            'Ce compte a déjà été activé. Connectez-vous directement sur la page de connexion avec votre adresse email et votre mot de passe.',
        },
        { status: 409 }
      )
    }

    const requestedEmail = ((body as any).email as string | undefined)?.trim()
    const email = requestedEmail ?? data.email?.trim()
    if (!email) {
      return NextResponse.json(
        {
          message:
            'Aucun email fourni. Veuillez renseigner votre adresse email dans le formulaire.',
        },
        { status: 400 }
      )
    }

    // Valider le format email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          message: 'Format d\'email invalide. Vérifiez votre adresse email.',
        },
        { status: 400 }
      )
    }

    console.log('[team/activate] Activation initiated:', { accessId, email, hasDocEmail: !!data.email, hasFormEmail: !!(body as any).email })

    // ── 2. Créer ou mettre à jour l'utilisateur Firebase Auth ──
    let uid: string
    try {
      const existing = await adminAuth.getUserByEmail(email)
      await adminAuth.updateUser(existing.uid, { password })
      uid = existing.uid
      console.log('[team/activate] Updated existing user:', { uid, email })
    } catch (authErr: unknown) {
      const code = (authErr as { code?: string })?.code
      if (code === 'auth/user-not-found') {
        const newUser = await adminAuth.createUser({
          email,
          password,
          displayName: [
            data.firstname ?? data.firstName ?? '',
            data.lastname  ?? data.lastName  ?? '',
          ].join(' ').trim() || undefined,
        })
        uid = newUser.uid
        console.log('[team/activate] Created new user:', { uid, email })
      } else {
        console.error('[team/activate] Firebase Auth error:', { code, message: (authErr as Error).message })
        throw authErr
      }
    }

    const userDocRef = adminDb.collection('users').doc(uid)
    const userDocSnap = await userDocRef.get()
    const createdAt = userDocSnap.exists ? userDocSnap.data()?.createdAt ?? new Date() : new Date()

    // ── 3. Écrire / fusionner le document utilisateur Firestore ──
    await userDocRef.set(
      {
        uid,
        email,
        name: [
          data.firstname ?? data.firstName ?? '',
          data.lastname  ?? data.lastName  ?? '',
        ].join(' ').trim() || null,
        role:       data.role      ?? 'member',
        plan:       data.plan      ?? 'free',
        active:     true,
        activated:  true,
        company:    data.company   ?? null,
        sector:     data.sector    ?? null,
        region:     data.region    ?? null,
        managerId:  data.managerId  ?? null,
        managerUid: data.managerUid ?? data.managerId ?? null,
        managerEmail: data.managerEmail ?? null,
        dailyUsed:   0,
        dailyLimit:  data.dailyLimit ?? 10,
        createdAt,
        activatedAt: new Date(),
      },
      { merge: true }
    )

    // ── 3.5. SET CUSTOM CLAIMS for Firestore rules ──────────────────────────
    const userRole = data.role ?? 'member'
    await adminAuth.setCustomUserClaims(uid, { role: userRole })

    // ── 4. Marquer l'accès comme activé ──
    await adminDb.collection(col).doc(accessId).update({
      activated:    true,
      status:       'active',
      email,
      firebaseUid:  uid,
      activatedAt:  new Date(),
      activatedUid: uid,
    })

    console.log('[team/activate] Account activated successfully:', { accessId, email, uid })

    return NextResponse.json({ success: true, uid })
  } catch (error) {
    console.error('[team/activate] Error:', error)
    console.error('[team/activate] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined,
    })

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

// Méthode incorrecte — retourner JSON pas HTML
export async function GET() {
  return NextResponse.json({ message: 'Méthode non autorisée' }, { status: 405 })
}
