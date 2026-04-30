export const plans = ['free', 'starter', 'pro', 'enterprise'] as const
export type UserPlan = (typeof plans)[number]