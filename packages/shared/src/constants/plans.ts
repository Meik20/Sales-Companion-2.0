export const plans = ['free', 'starter', 'pro', 'enterprise'] as const
export type UserPlan = (typeof plans)[number]

export const PLAN_LIMITS: Record<UserPlan, number> = {
  free: 10,
  starter: 50,
  pro: 200,
  enterprise: 1000
}

export const PLAN_PRICES: Record<UserPlan, number> = {
  free: 0,
  starter: 5000,
  pro: 15000,
  enterprise: 50000
}
