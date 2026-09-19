export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { syncTeamMemberPlans } from '@/lib/sync-team-plan'

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

    await userDocRef.update({
      ...safeFields,
      updatedAt: new Date()
    })

    // ── Propagation du plan aux membres de l'équipe ─────────────────────────
    // Déclenché si le plan OU le dailyLimit du manager change
    // Les support_agents sont exclus (accès illimité sans quota de recherche)
    if ((safeFields.plan || safeFields.dailyLimit !== undefined) && oldData?.role === 'manager') {
      try {
        // Si plan explicite fourni, on l'utilise directement
        // Sinon on récupère le plan actuel du manager pour passer le bon
        const planToSync = safeFields.plan ?? oldData?.plan
        if (planToSync) {
          const syncResult = await syncTeamMemberPlans(uid, planToSync)
          console.log(
            `[admin/users] 👥 sync équipe manager=${uid}: ${syncResult.updatedUsers} membres, ${syncResult.updatedAccesses} accès mis à jour`
          )
        }
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
