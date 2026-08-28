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

    const { accessId: rawAccessId, password } = body as { accessId?: string; password?: string }

    if (!rawAccessId || !password) {
      return NextResponse.json({ message: 'accessId et password sont requis' }, { status: 400 })
    }
    const accessIdLower = rawAccessId.trim().toLowerCase()
    const accessIdRaw = rawAccessId.trim()
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Le mot de passe doit comporter au moins 6 caractères' },
        { status: 400 }
      )
    }

    // ── 1. Chercher le document d'accès (plusieurs collections possibles) ──
    let snap: any = null
    const ACCESS_COLLECTIONS = ['team_accesses', 'teamAccesses', 'accesses'] as const

    for (const col of ACCESS_COLLECTIONS) {
      // 1. Chercher par document ID exact
      let testSnap = await adminDb.collection(col).doc(accessIdRaw).get()
      if (testSnap.exists) {
        snap = testSnap
        break
      }

      // 1b. Chercher par document ID minuscule
      if (accessIdLower !== accessIdRaw) {
        let testSnapLower = await adminDb.collection(col).doc(accessIdLower).get()
        if (testSnapLower.exists) {
          snap = testSnapLower
          break
        }
      }

      // 2. Chercher par magicCode (Nouveau système Magic Link)
      const byMagicCode = await adminDb.collection(col).where('magicCode', '==', accessIdRaw).limit(1).get()
      if (!byMagicCode.empty && byMagicCode.docs[0]) {
        snap = byMagicCode.docs[0]
        break
      }

      // 3. Chercher par accessId
      const byAccessId = await adminDb.collection(col).where('accessId', '==', accessIdLower).limit(1).get()
      if (!byAccessId.empty && byAccessId.docs[0]) {
        snap = byAccessId.docs[0]
        break
      }
    }

    if (!snap || !snap.exists) {
      return NextResponse.json(
        {
          message:
            "Lien d'activation invalide ou expiré. Vérifiez l'identifiant d'accès fourni par votre manager ou demandez un nouveau lien."
        },
        { status: 404 }
      )
    }

    const data = snap.data()
    if (!data) {
      return NextResponse.json(
        { message: "Document d'activation invalide ou corrompu." },
        { status: 404 }
      )
    }

    if (data.activated === true || data.status === 'activated' || data.status === 'active') {
      return NextResponse.json(
        {
          message:
            'Ce compte a déjà été activé. Connectez-vous directement sur la page de connexion avec votre adresse email et votre mot de passe.'
        },
        { status: 409 }
      )
    }

    const requestedEmail = (body as { email?: string }).email?.trim()
    const email = requestedEmail ?? data.email?.trim()
    if (!email) {
      return NextResponse.json(
        {
          message: 'Aucun email fourni. Veuillez renseigner votre adresse email dans le formulaire.'
        },
        { status: 400 }
      )
    }

    // Valider le format email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          message: "Format d'email invalide. Vérifiez votre adresse email."
        },
        { status: 400 }
      )
    }

    // ── 2. Créer ou mettre à jour l'utilisateur Firebase Auth ──
    let uid: string
    try {
      const existing = await adminAuth.getUserByEmail(email)
      await adminAuth.updateUser(existing.uid, { password })
      uid = existing.uid
    } catch (authErr: unknown) {
      const authCode = typeof (authErr as Record<string, unknown>).code === 'string'
        ? (authErr as Record<string, unknown>).code as string
        : ''
      if (authCode === 'auth/user-not-found') {
        const newUser = await adminAuth.createUser({
          email,
          password,
          displayName:
            [data.firstname ?? data.firstName ?? '', data.lastname ?? data.lastName ?? '']
              .join(' ')
              .trim() || undefined
        })
        uid = newUser.uid
      } else {
        console.error('[team/activate] Firebase Auth error:', {
          code: authCode,
          message: authErr instanceof Error ? authErr.message : String(authErr)
        })
        throw authErr
      }
    }

    const userDocRef = adminDb.collection('users').doc(uid)
    const userDocSnap = await userDocRef.get()
    const createdAt = userDocSnap.exists
      ? (userDocSnap.data()?.createdAt ?? new Date())
      : new Date()

    // ── 3. Écrire / fusionner le document utilisateur Firestore ──
    await userDocRef.set(
      {
        uid,
        email,
        name:
          [data.firstname ?? data.firstName ?? '', data.lastname ?? data.lastName ?? '']
            .join(' ')
            .trim() || null,
        role: data.role ?? 'member',
        plan: data.plan ?? 'free',
        active: true,
        activated: true,
        company: data.company ?? null,
        sector: data.sector ?? null,
        region: data.region ?? null,
        managerId: data.managerId ?? null,
        managerUid: data.managerUid ?? data.managerId ?? null,
        managerEmail: data.managerEmail ?? null,
        accessId: accessIdLower, // ← Access ID (ex: "prenomnom@entreprise")
        dailyUsed: 0,
        dailyLimit: data.dailyLimit ?? 10,
        createdAt,
        activatedAt: new Date()
      },
      { merge: true }
    )

    // ── 3.5. SET CUSTOM CLAIMS for Firestore rules ──────────────────────────
    const userRole = data.role ?? 'member'
    await adminAuth.setCustomUserClaims(uid, { role: userRole })

    // ── 4. Marquer l'accès comme activé ──
    await snap.ref.update({
      activated: true,
      status: 'active',
      email,
      firebaseUid: uid,
      activatedAt: new Date(),
      activatedUid: uid
    })

    // Activation successful — no sensitive log in production

    return NextResponse.json({ success: true, uid })
  } catch (error) {
    console.error('[team/activate] Error:', {
      message: error instanceof Error ? error.message : String(error),
      code: typeof (error as Record<string, unknown>)?.code === 'string'
        ? (error as Record<string, unknown>).code
        : undefined
    })

    const msg =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Erreur serveur inconnue'

    return NextResponse.json({ message: `Activation impossible : ${msg}` }, { status: 500 })
  }
}

// Méthode incorrecte — retourner JSON pas HTML
export async function GET() {
  return NextResponse.json({ message: 'Méthode non autorisée' }, { status: 405 })
}
