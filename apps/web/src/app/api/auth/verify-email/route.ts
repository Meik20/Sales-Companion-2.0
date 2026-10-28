import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, checkRateLimit } from '@/lib/rate-limit'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'
import { PLAN_LIMITS } from '@sales-companion/shared'

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
      return NextResponse.json(
        { message: 'Trop de tentatives, veuillez réessayer plus tard.' },
        { status: 429 }
      )
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

    const userData = userSnap.data() ?? {}
    if (
      userData.emailVerificationPending === false ||
      (userData.activated === true && !userData.emailVerificationPending)
    ) {
      // Déjà traité (idempotence) — évite les boucles d'appels et les notifications dupliquées
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        alreadyActivated: Boolean(userData.activated)
      })
    }

    // RÈGLE MÉTIER (AGENTS.md) :
    // - Les utilisateurs non-managers (independent, member, support_agent) sont activés directement.
    // - Les Team Managers (role === 'manager' && orgRole === 'team_manager') rattachés à un Senior Manager
    //   ayant un forfait actif payant passent directement au statut actif et héritent de son plan.
    // - Les Senior Managers (orgRole === 'senior_manager') et managers indépendants gèrent leur propre plan
    //   et ne sont activés qu'après souscription et validation de paiement.
    const isManager = userData.role === 'manager'
    let isTeamManager = isManager && userData.orgRole === 'team_manager'
    let smUid = userData.seniorManagerUid || null
    let shouldActivateTeamManager = false
    let inheritedPlanData: Record<string, unknown> = {}

    // Vérification de sécurité / fallback si orgRole n'est pas encore sur users/{uid}
    if (isManager && !isTeamManager) {
      try {
        const inviteQuery = await adminDb
          .collection('orgInvites')
          .where('usedByUid', '==', uid)
          .where('type', '==', 'team_manager')
          .limit(1)
          .get()
        if (!inviteQuery.empty) {
          isTeamManager = true
          const invData = inviteQuery.docs[0]?.data()
          smUid = invData?.seniorManagerUid || invData?.createdByUid || smUid
        }
      } catch (err) {
        console.warn('[auth/verify-email] Erreur recherche orgInvites:', err)
      }
    }

    if (isTeamManager) {
      if (!smUid && userData.orgCode) {
        try {
          const orgSnap = await adminDb.collection('organisations').doc(userData.orgCode).get()
          smUid = orgSnap.data()?.seniorManagerUid || null
        } catch (err) {
          console.warn('[auth/verify-email] Erreur recherche organisations:', err)
        }
      }

      if (smUid) {
        try {
          const smDoc = await adminDb.collection('users').doc(smUid).get()
          if (smDoc.exists) {
            const smData = smDoc.data()
            if (hasActivePaidManagerAccess(smData)) {
              shouldActivateTeamManager = true
              const plan = smData?.plan || 'enterprise'
              inheritedPlanData = {
                orgRole: 'team_manager',
                seniorManagerUid: smUid,
                plan,
                dailyLimit: PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? 50,
                subscriptionExpiresAt:
                  smData?.subscriptionExpiresAt ?? smData?.planExpiresAt ?? null,
                subscriptionStartedAt: smData?.subscriptionStartedAt ?? null,
                subscriptionExpired: false
              }
            }
          }
        } catch (err) {
          console.warn('[auth/verify-email] Erreur lecture SM:', err)
        }
      }
    }

    const shouldActivateNow = !isManager || shouldActivateTeamManager

    await userRef.update({
      emailVerificationPending: false,
      emailVerified: true,
      updatedAt: new Date(),
      ...(shouldActivateNow
        ? {
            activated: true,
            active: true,
            activatedAt: new Date(),
            ...inheritedPlanData
          }
        : {})
    })

    // ✅ Notification admin quand un manager autonome ou SM vérifie son email
    // (il va bientôt soumettre un paiement — l'admin peut anticiper).
    // Les Team Managers déjà activés par le forfait de leur SM n'ont pas besoin de notification d'attente de paiement.
    if (isManager && !shouldActivateTeamManager) {
      await createAdminNotification({
        type: 'new_manager',
        title: 'Nouveau Manager inscrit',
        message: `${email} a vérifié son email et est en attente de choix de plan. Un paiement devrait arriver prochainement.`,
        userId: uid,
        userEmail: email,
        link: '/admin/users',
        deduplicate: true
      })
    }

    // ── 2. Update team_accesses document ──────────────────────────────────
    const collections = ['team_accesses', 'teamAccesses', 'accesses'] as const
    for (const col of collections) {
      const snap = await adminDb.collection(col).where('firebaseUid', '==', uid).limit(1).get()
      if (!snap.empty && snap.docs[0]) {
        await snap.docs[0].ref.update({
          activated: true,
          status: 'active',
          activatedAt: new Date(),
          emailVerificationPending: false
        })
        break
      }
    }

    // Activation finalized — no sensitive data logged in production

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/verify-email]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
