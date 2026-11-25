export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { PLAN_LIMITS } from '@sales-companion/shared'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdminCached(token)

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '50', 10)

    const totalSnap = await adminDb.collection('users').count().get()
    const total = totalSnap.data().count

    const usersSnap = await adminDb
      .collection('users')
      .orderBy('createdAt', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .get()

    // Résolution en lot des SM1 par organisation pour identifier les comptes hérités
    const orgCodes = Array.from(
      new Set(
        usersSnap.docs
          .map((d) => d.data().orgCode as string | undefined)
          .filter((c): c is string => Boolean(c))
      )
    )
    const orgSm1Map = new Map<string, string>()
    if (orgCodes.length > 0) {
      const orgRefs = orgCodes.map((code) => adminDb.collection('organisations').doc(code))
      const orgSnaps = await adminDb.getAll(...orgRefs)
      orgSnaps.forEach((s) => {
        if (s.exists) {
          const smUid = s.data()?.seniorManagerUid as string | undefined
          if (smUid) orgSm1Map.set(s.id, smUid)
        }
      })
    }

    const items = usersSnap.docs.map((doc) => {
      const data = doc.data()
      const today = new Date().toISOString().slice(0, 10)
      const plan = (data.plan || 'free') as keyof typeof PLAN_LIMITS
      const isMonthly = plan === 'free'
      const isSamePeriod = isMonthly
        ? data.lastResetDate
          ? data.lastResetDate.slice(0, 7) === today.slice(0, 7)
          : false
        : data.lastResetDate === today
      const currentDailyUsed = isSamePeriod ? (data.dailyUsed ?? 0) : 0
      const orgCode = (data.orgCode as string | undefined) ?? null
      const orgSm1Uid = orgCode ? orgSm1Map.get(orgCode) : undefined
      const isPrimarySeniorManager =
        data.role === 'manager' &&
        data.orgRole !== 'team_manager' &&
        data.orgRole !== 'executive' &&
        data.isPrimarySeniorManager !== false &&
        !data.invitedByUid &&
        !data.seniorManagerUid &&
        (!orgSm1Uid || orgSm1Uid === doc.id)

      return {
        uid: doc.id,
        name: data.name ?? null,
        email: data.email ?? null,
        role: data.role ?? 'member',
        plan: data.plan ?? 'free',
        active: data.active ?? true,
        dailyUsed: currentDailyUsed,
        dailyLimit: PLAN_LIMITS[plan] ?? 10,
        company: data.company ?? null,
        sector: data.sector ?? null,
        region: data.region ?? null,
        phone: data.phone ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() ?? null,
        subscriptionExpiresAt: data.subscriptionExpiresAt ?? data.planExpiresAt ?? null,
        managerId: data.managerId ?? data.managerUid ?? null,
        orgCode,
        orgRole: data.orgRole ?? null,
        seniorManagerUid: data.seniorManagerUid ?? null,
        invitedByUid: data.invitedByUid ?? null,
        isPrimarySeniorManager
      }
    })

    return NextResponse.json({ items, total, page, pageSize })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    if (msg === 'unauthenticated')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (msg === 'forbidden') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
