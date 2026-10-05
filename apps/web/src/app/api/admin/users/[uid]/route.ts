export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { syncTeamMemberPlans } from '@/lib/sync-team-plan'
import { PLAN_LIMITS } from '@sales-companion/shared'

async function verifyAdmin(token: string | null) {
  return verifyAdminCached(token)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdmin(token)

    const { uid } = await params
    const body = await request.json()

    // Strip fields that should not be mutated directly
    const { uid: _uid, email: _email, ...safeFields } = body

    const userDocRef = adminDb.collection('users').doc(uid)
    const oldSnap = await userDocRef.get()
    const oldData = oldSnap.data()

    // ── Calcul automatique d'expiration si le plan change ────────────────────
    const updatePayload: Record<string, unknown> = {
      ...safeFields,
      updatedAt: new Date()
    }

    if (safeFields.plan !== undefined) {
      if (safeFields.plan !== 'free') {
        // Nouveau plan payant : si pas d'expiration explicite fournie, fixer à 30 jours à minuit
        if (!safeFields.subscriptionExpiresAt) {
          const { calculateSubscriptionExpiry } = await import('@/lib/subscription')
          const expiresAt = calculateSubscriptionExpiry()
          updatePayload.subscriptionStartedAt = new Date().toISOString()
          updatePayload.subscriptionExpiresAt = expiresAt.toISOString()
          updatePayload.subscriptionExpired = false
        }
      } else {
        // Rétrogradation manuelle à "free"
        updatePayload.dailyLimit = safeFields.dailyLimit ?? PLAN_LIMITS.free ?? 10
        updatePayload.subscriptionExpired = true
        updatePayload.subscriptionExpiresAt = null
        updatePayload.subscriptionDowngradeReason = 'admin'
      }
    }

    await userDocRef.update(updatePayload)

    // ── Propagation du plan et de la validité aux membres de l'équipe ─────
    // Déclenché si le plan, le quota OU la date d'expiration du manager change
    const isManager = (oldData?.role === 'manager' || safeFields.role === 'manager')
    const hasPlanOrExpiryChange =
      safeFields.plan !== undefined ||
      safeFields.dailyLimit !== undefined ||
      safeFields.subscriptionExpiresAt !== undefined ||
      updatePayload.subscriptionExpiresAt !== undefined

    if (hasPlanOrExpiryChange && isManager) {
      try {
        const planToSync = (safeFields.plan ?? oldData?.plan ?? 'free') as any
        const expiresToSync =
          (updatePayload.subscriptionExpiresAt !== undefined
            ? updatePayload.subscriptionExpiresAt
            : (oldData?.subscriptionExpiresAt ?? null)) as string | null
        const startedToSync =
          (updatePayload.subscriptionStartedAt !== undefined
            ? updatePayload.subscriptionStartedAt
            : (oldData?.subscriptionStartedAt ?? null)) as string | null
        const expiredToSync =
          updatePayload.subscriptionExpired !== undefined
            ? (updatePayload.subscriptionExpired as boolean)
            : (oldData?.subscriptionExpired ?? false)

        const syncResult = await syncTeamMemberPlans(uid, planToSync, {
          subscriptionExpiresAt: expiresToSync,
          subscriptionStartedAt: startedToSync,
          subscriptionExpired: expiredToSync
        })
        console.log(
          `[admin/users] 👥 sync équipe manager=${uid}: ${syncResult.updatedUsers} utilisateurs, ${syncResult.updatedAccesses} accès mis à jour`
        )
      } catch (syncErr) {
        // Non-bloquant
        console.error('[admin/users] sync team plan failed (non-blocking):', syncErr)
      }
    }

    // If role change is included, update custom claims too
    if (safeFields.role) {
      await adminAuth.setCustomUserClaims(uid, { role: safeFields.role })
    }

    const updated = await adminDb.collection('users').doc(uid).get()
    return NextResponse.json({ uid, ...updated.data() })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdmin(token)

    const { uid } = await params

    // Delete from Firebase Auth and Firestore in parallel
    await Promise.all([adminAuth.deleteUser(uid), adminDb.collection('users').doc(uid).delete()])

    return NextResponse.json({ success: true, uid })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
