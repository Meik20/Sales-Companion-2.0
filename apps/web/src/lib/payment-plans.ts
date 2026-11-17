import { PLAN_LIMITS, PLAN_PRICES, plans, type UserPlan } from '@sales-companion/shared'

/**
 * payment-plans.ts — Définition partagée des plans CAMPAY
 * Utilisé par les routes API initiate, status et webhook.
 *
 * Sécurité : PLANS est une constante immuable exclusivement serveur.
 * Le montant facturé est TOUJOURS résolu depuis cette table — jamais depuis le client.
 */
export const PLANS: Record<UserPlan, { label: string; amount: number; dailyLimit: number }> = {
  free: { label: 'Free', amount: PLAN_PRICES.free, dailyLimit: PLAN_LIMITS.free },
  starter: { label: 'Starter', amount: PLAN_PRICES.starter, dailyLimit: PLAN_LIMITS.starter },
  pro: { label: 'Pro', amount: PLAN_PRICES.pro, dailyLimit: PLAN_LIMITS.pro },
  enterprise: {
    label: 'Enterprise',
    amount: PLAN_PRICES.enterprise,
    dailyLimit: PLAN_LIMITS.enterprise
  }
} as const

/**
 * Liste blanche canonique des plans payants (hors 'free').
 * Seuls ces plans peuvent initier un paiement CAMPAY.
 */
export const PAID_PLANS = plans.filter((p) => PLAN_PRICES[p] > 0) as UserPlan[]

/**
 * Accès sécurisé à PLANS par clé arbitraire (venant de Firestore, webhooks, etc.).
 * Évite le TS7053 sur `PLANS[string]` tout en préservant la résolution serveur exclusive.
 * @returns L'entrée du plan, ou undefined si la clé est inconnue.
 */
export function lookupPlan(plan: unknown): (typeof PLANS)[UserPlan] | undefined {
  if (typeof plan !== 'string') return undefined
  return plan in PLANS ? PLANS[plan as UserPlan] : undefined
}

/**
 * Résout le montant serveur pour un plan donné.
 * Renvoie undefined si le plan est inconnu ou non payant.
 * Cette fonction est la SEULE source de vérité pour le montant facturé.
 */
export function resolvePlanAmount(plan: string): number | undefined {
  const info = lookupPlan(plan)
  return info && info.amount > 0 ? info.amount : undefined
}
