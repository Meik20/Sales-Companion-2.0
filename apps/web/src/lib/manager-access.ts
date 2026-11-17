import { PLAN_LIMITS } from '@sales-companion/shared'

type ManagerAccount = {
  role?: unknown
  orgRole?: unknown
  orgCode?: unknown
  seniorManagerUid?: unknown
  active?: unknown
  activated?: unknown
  emailVerified?: unknown
  emailVerificationPending?: unknown
  paymentPending?: unknown
  plan?: unknown
  subscriptionExpired?: unknown
  subscriptionExpiresAt?: unknown
  planExpiresAt?: unknown
}

function getExpiryTime(value: unknown): number {
  if (typeof value === 'string') return Date.parse(value)
  if (value instanceof Date) return value.getTime()
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = value.toDate
    if (typeof toDate === 'function') return toDate.call(value).getTime()
  }
  return Number.NaN
}

export function hasActivePaidManagerAccess(account: ManagerAccount | undefined): boolean {
  if (
    account?.role !== 'manager' ||
    account.active !== true ||
    account.emailVerificationPending === true ||
    account.paymentPending === true ||
    !account.plan ||
    account.plan === 'free' ||
    account.subscriptionExpired === true
  ) {
    return false
  }

  const expiresAt = getExpiryTime(account.subscriptionExpiresAt ?? account.planExpiresAt)
  return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

/**
 * Vérifie et résout l'accès actif d'un manager.
 * Pour un Team Manager rattaché à un Senior Manager actif, auto-synchronise le plan si nécessaire.
 */
export async function verifyAndSyncManagerAccess(
  adminDb: any,
  uid: string,
  managerData: any
): Promise<{ hasAccess: boolean; data: any }> {
  if (hasActivePaidManagerAccess(managerData)) {
    return { hasAccess: true, data: managerData }
  }

  // Vérification de secours pour les Team Managers
  const isTeamManager =
    managerData?.role === 'manager' &&
    (managerData?.orgRole === 'team_manager' || Boolean(managerData?.seniorManagerUid))

  if (!isTeamManager) {
    return { hasAccess: false, data: managerData }
  }

  let smUid = managerData?.seniorManagerUid || null
  if (!smUid && managerData?.orgCode) {
    try {
      const orgSnap = await adminDb.collection('organisations').doc(managerData.orgCode).get()
      smUid = orgSnap.data()?.seniorManagerUid || null
    } catch {
      /* ignore */
    }
  }

  if (smUid) {
    try {
      const smSnap = await adminDb.collection('users').doc(smUid).get()
      const smData = smSnap.data()
      if (smSnap.exists && smData && hasActivePaidManagerAccess(smData)) {
        const activePlan = smData.plan || 'enterprise'
        const updates: Record<string, unknown> = {
          plan: activePlan,
          active: true,
          activated: true,
          seniorManagerUid: smUid,
          dailyLimit: PLAN_LIMITS[activePlan as keyof typeof PLAN_LIMITS] ?? 50,
          subscriptionExpiresAt: smData.subscriptionExpiresAt ?? smData.planExpiresAt ?? null,
          subscriptionStartedAt: smData.subscriptionStartedAt ?? null,
          subscriptionExpired: false,
          updatedAt: new Date()
        }
        await adminDb.collection('users').doc(uid).update(updates)
        const updatedData = { ...managerData, ...updates }
        return { hasAccess: true, data: updatedData }
      }
    } catch {
      /* ignore */
    }
  }

  return { hasAccess: false, data: managerData }
}
