type ManagerAccount = {
  role?: unknown
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
