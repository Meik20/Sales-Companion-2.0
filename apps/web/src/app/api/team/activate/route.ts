import { NextRequest, NextResponse } from 'next/server'

// Lazy import pour éviter les erreurs HTML si firebase-admin ne s'initialise pas
async function getAdminModules() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdminModules()

    // ── 0. Rate limiting strict pour prévenir les attaques par force brute ──
    const { checkRateLimit, getClientIp } = await import('@/lib/rate-limit')
    const ip = getClientIp(request)
    const rl = await checkRateLimit(`team-activate:${ip}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000
    })
    if (!rl.success) {
      return NextResponse.json(
        { message: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.' },
        { status: 429 }
      )
    }

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

    // ── 1. Chercher le document d'accès EXCLUSIVEMENT par secret aléatoire (Magic Code) ──
    // Protection P0 : Rejeter formellement tout identifiant prévisible ou trop court
    if (accessIdRaw.includes('@') || accessIdRaw.length < 16) {
      return NextResponse.json(
        {
          message:
            "Pour des raisons de sécurité, l'activation d'un compte requiert impérativement le lien magique sécurisé ou le code secret d'invitation (l'identifiant public ne peut pas être utilisé pour activer un compte)."
        },
        { status: 400 }
      )
    }

    let snap: any = null
    const ACCESS_COLLECTIONS = ['team_accesses', 'teamAccesses', 'accesses'] as const

    for (const col of ACCESS_COLLECTIONS) {
      // Recherche EXCLUSIVE par magicCode (Code secret aléatoire à usage unique)
      const byMagicCode = await adminDb
        .collection(col)
        .where('magicCode', '==', accessIdRaw)
        .limit(1)
        .get()
      if (!byMagicCode.empty && byMagicCode.docs[0]) {
        snap = byMagicCode.docs[0]
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

    // Vérification de validité temporelle de l'invitation
    if (data.expiresAt) {
      const expDate =
        typeof data.expiresAt.toDate === 'function'
          ? data.expiresAt.toDate()
          : new Date(data.expiresAt)
      if (expDate < new Date()) {
        return NextResponse.json(
          {
            message:
              "Cette invitation a expiré. Veuillez contacter votre manager pour recevoir un nouveau lien d'activation."
          },
          { status: 410 }
        )
      }
    }

    const officialEmail = data.email?.trim()
    const requestedEmail = (body as { email?: string }).email?.trim()

    // Si une adresse email professionnelle est liée à cette invitation, elle est obligatoire et immuable
    if (officialEmail) {
      if (requestedEmail && requestedEmail.toLowerCase() !== officialEmail.toLowerCase()) {
        return NextResponse.json(
          {
            message: `Vous devez obligatoirement activer votre accès avec l'adresse email professionnelle invitée (${officialEmail}).`
          },
          { status: 400 }
        )
      }
    }

    const email = officialEmail || requestedEmail
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

    // ── 2. Créer ou associer l'utilisateur Firebase Auth ──
    let uid: string
    let accountLinked = false
    try {
      const existing = await adminAuth.getUserByEmail(email)
      uid = existing.uid
      accountLinked = true
      // Protection anti-prise de contrôle de compte :
      // Si le compte existe déjà, on ne remplace PAS son mot de passe en aveugle.
      // L'utilisateur conserve ses identifiants et son compte est rattaché à l'organisation.
    } catch (authErr: unknown) {
      const authCode =
        typeof (authErr as Record<string, unknown>).code === 'string'
          ? ((authErr as Record<string, unknown>).code as string)
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

    // ── 2.5. Récupérer dynamiquement le plan et la validité du manager ──
    let memberPlan = data.plan ?? 'free'
    let memberDailyLimit = data.dailyLimit ?? 10
    let managerExpiresAt: string | null = null
    let managerStartedAt: string | null = null
    let managerExpired = false
    const mUid = data.managerUid ?? data.managerId
    // DEFENSE IN DEPTH : Seuls les rôles 'member' et 'support_agent' peuvent être activés via invitation.
    // Aucune invitation ne peut conférer de rôle admin, manager ou supérieur.
    const rawRole = data.role ?? 'member'
    const userRole = rawRole === 'support_agent' ? 'support_agent' : 'member'

    if (mUid) {
      try {
        const mDoc = await adminDb.collection('users').doc(mUid).get()
        if (mDoc.exists) {
          const mData = mDoc.data()
          if (mData?.plan) {
            memberPlan = mData.plan
            const { PLAN_LIMITS } = await import('@sales-companion/shared')
            if (userRole !== 'support_agent') {
              memberDailyLimit =
                PLAN_LIMITS[mData.plan as keyof typeof PLAN_LIMITS] ?? memberDailyLimit
            }
          }
          managerExpiresAt = mData?.subscriptionExpiresAt ?? mData?.planExpiresAt ?? null
          managerStartedAt = mData?.subscriptionStartedAt ?? null
          managerExpired = mData?.subscriptionExpired ?? false
        }
      } catch (err) {
        console.warn('[team/activate] Failed to fetch manager plan:', err)
      }
    }

    // ── 3. Consommation atomique de l'invitation et écriture utilisateur Firestore (Transaction) ──
    try {
      await adminDb.runTransaction(async (transaction: any) => {
        const accessDocRef = snap.ref as FirebaseFirestore.DocumentReference
        const freshSnap = (await transaction.get(
          accessDocRef
        )) as FirebaseFirestore.DocumentSnapshot
        if (!freshSnap.exists) {
          throw new Error('INVITATION_NOT_FOUND')
        }
        const freshData = freshSnap.data()
        if (
          freshData?.activated === true ||
          freshData?.status === 'active' ||
          freshData?.status === 'activated'
        ) {
          throw new Error('ALREADY_ACTIVATED')
        }
        if (freshData?.expiresAt) {
          const expDate =
            typeof freshData.expiresAt.toDate === 'function'
              ? freshData.expiresAt.toDate()
              : new Date(freshData.expiresAt)
          if (expDate < new Date()) {
            throw new Error('EXPIRED')
          }
        }

        // Marquer l'accès comme consommé de manière atomique
        transaction.update(snap.ref, {
          activated: true,
          status: 'active',
          email,
          firebaseUid: uid,
          activatedAt: new Date(),
          activatedUid: uid,
          ...(userRole !== 'support_agent'
            ? { plan: memberPlan, dailyLimit: memberDailyLimit }
            : {})
        })

        // Écrire / fusionner le profil utilisateur Firestore
        transaction.set(
          userDocRef,
          {
            uid,
            email,
            name:
              [data.firstname ?? data.firstName ?? '', data.lastname ?? data.lastName ?? '']
                .join(' ')
                .trim() || null,
            role: userRole,
            plan: memberPlan,
            active: true,
            activated: true,
            emailVerified: true,
            company: data.company ?? null,
            sector: data.sector ?? null,
            region: data.region ?? null,
            managerId: data.managerId ?? null,
            managerUid: data.managerUid ?? data.managerId ?? null,
            managerEmail: data.managerEmail ?? null,
            accessId: accessIdLower,
            dailyUsed: 0,
            dailyLimit: memberDailyLimit,
            subscriptionExpiresAt: managerExpiresAt,
            subscriptionStartedAt: managerStartedAt,
            subscriptionExpired: managerExpired,
            createdAt,
            activatedAt: new Date()
          },
          { merge: true }
        )
      })
    } catch (txErr: any) {
      if (txErr?.message === 'ALREADY_ACTIVATED') {
        return NextResponse.json(
          {
            message:
              'Ce compte a déjà été activé. Connectez-vous directement sur la page de connexion.'
          },
          { status: 409 }
        )
      }
      if (txErr?.message === 'EXPIRED') {
        return NextResponse.json(
          {
            message:
              "Cette invitation a expiré. Veuillez contacter votre manager pour recevoir un nouveau lien d'activation."
          },
          { status: 410 }
        )
      }
      throw txErr
    }

    // ── 3.5. SET CUSTOM CLAIMS for Firestore rules ──────────────────────────
    await adminAuth.setCustomUserClaims(uid, { role: userRole })

    // Activation successful — no sensitive log in production

    return NextResponse.json({
      success: true,
      uid,
      accountLinked,
      message: accountLinked
        ? 'Compte rattaché avec succès. Utilisez votre mot de passe habituel pour vous connecter.'
        : 'Compte activé avec succès.'
    })
  } catch (error) {
    console.error('[team/activate] Error:', {
      message: error instanceof Error ? error.message : String(error),
      code:
        typeof (error as Record<string, unknown>)?.code === 'string'
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
