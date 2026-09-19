/**
 * POST /api/admin/users/sync-team-plan
 * -------------------------------------
 * Route admin-only pour resynchroniser manuellement le plan d'un manager
 * vers tous ses membres actifs (role=member uniquement).
 *
 * Utile pour corriger les membres existants dont le plan n'a pas été
 * mis à jour lors d'un upgrade précédent.
 *
 * Body: { managerUid: string }
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { syncTeamMemberPlans } from '@/lib/sync-team-plan'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdminCached(token)

    const body = await request.json().catch(() => ({}))
    const { managerUid: inputUid, managerEmail: inputEmail, syncAll } = body as {
      managerUid?: string
      managerEmail?: string
      syncAll?: boolean
    }

    // Cas 1 : Synchroniser TOUS les managers et leurs équipes
    if (syncAll) {
      const managersSnap = await adminDb.collection('users').where('role', '==', 'manager').get()
      let totalUsers = 0
      let totalAccesses = 0
      const managerResults: Array<{ email?: string; plan: string; updatedUsers: number; updatedAccesses: number }> = []

      for (const mDoc of managersSnap.docs) {
        const mData = mDoc.data()
        const plan = mData.plan ?? 'free'
        const res = await syncTeamMemberPlans(mDoc.id, plan)
        totalUsers += res.updatedUsers
        totalAccesses += res.updatedAccesses
        if (res.updatedUsers > 0 || res.updatedAccesses > 0) {
          managerResults.push({
            email: mData.email,
            plan,
            updatedUsers: res.updatedUsers,
            updatedAccesses: res.updatedAccesses
          })
        }
      }

      return NextResponse.json({
        success: true,
        mode: 'all_managers',
        managersProcessed: managersSnap.size,
        totalUsersUpdated: totalUsers,
        totalAccessesUpdated: totalAccesses,
        details: managerResults
      })
    }

    // Cas 2 : Par managerUid ou managerEmail
    let managerDoc: FirebaseFirestore.DocumentSnapshot | null = null
    let targetUid = inputUid

    if (!targetUid && inputEmail) {
      const emailSnap = await adminDb
        .collection('users')
        .where('email', '==', inputEmail.trim().toLowerCase())
        .limit(1)
        .get()
      if (!emailSnap.empty) {
        managerDoc = emailSnap.docs[0]!
        targetUid = managerDoc.id
      }
    } else if (targetUid) {
      managerDoc = await adminDb.collection('users').doc(targetUid).get()
    }

    if (!managerDoc || !managerDoc.exists || !targetUid) {
      return NextResponse.json(
        { error: 'Manager introuvable (fournir managerUid ou managerEmail valide)' },
        { status: 404 }
      )
    }

    const managerData = managerDoc.data()!
    if (managerData.role !== 'manager') {
      return NextResponse.json(
        { error: `Cet utilisateur n'est pas un manager (rôle actuel: ${managerData.role})` },
        { status: 400 }
      )
    }

    const managerPlan = managerData.plan ?? 'free'

    console.log(
      `[sync-team-plan] Resync demandée : manager=${targetUid} (${managerData.email}) plan=${managerPlan}`
    )

    const result = await syncTeamMemberPlans(targetUid, managerPlan)

    return NextResponse.json({
      success: true,
      managerUid: targetUid,
      managerEmail: managerData.email,
      planApplied: managerPlan,
      ...result
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden')
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('[sync-team-plan] error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
