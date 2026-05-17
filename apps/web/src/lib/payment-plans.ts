import { PLAN_LIMITS, PLAN_PRICES } from '@sales-companion/shared'

/**
 * payment-plans.ts — Définition partagée des plans CAMPAY
 * Utilisé par les routes API initiate, status et webhook.
 */

export const PLANS: Record<string, { label: string; amount: number; dailyLimit: number }> = {
  free: { label: 'Free', amount: PLAN_PRICES.free, dailyLimit: PLAN_LIMITS.free },
  starter: { label: 'Starter', amount: PLAN_PRICES.starter, dailyLimit: PLAN_LIMITS.starter },
  pro: { label: 'Pro', amount: PLAN_PRICES.pro, dailyLimit: PLAN_LIMITS.pro },
  enterprise: {
    label: 'Enterprise',
    amount: PLAN_PRICES.enterprise,
    dailyLimit: PLAN_LIMITS.enterprise
  }
}
