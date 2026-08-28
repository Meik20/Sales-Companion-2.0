export const plans = ['free', 'starter', 'pro', 'enterprise'] as const
export type UserPlan = (typeof plans)[number]

/**
 * Quota de recherche par plan.
 * - free     : 10 recherches / MOIS (réinitialisation mensuelle)
 * - starter  : 10 recherches / JOUR
 * - pro      : 20 recherches / JOUR
 * - enterprise: 50 recherches / JOUR
 */
export const PLAN_LIMITS: Record<UserPlan, number> = {
  free: 10,
  starter: 10,
  pro: 20,
  enterprise: 50
}

/** true = quota mensuel, false = quota quotidien */
export const PLAN_IS_MONTHLY: Record<UserPlan, boolean> = {
  free: true,
  starter: false,
  pro: false,
  enterprise: false
}

export const PLAN_PRICES: Record<UserPlan, number> = {
  free: 0,
  starter: 5000,
  pro: 15000,
  enterprise: 50000
}
