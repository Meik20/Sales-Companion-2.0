/**
 * payment-plans.ts — Définition partagée des plans CAMPAY
 * Utilisé par les routes API initiate, status et webhook.
 */

export const PLANS: Record<string, { label: string; amount: number; dailyLimit: number }> = {
  free:       { label: 'Free',       amount: 0,     dailyLimit: 10    },
  starter:    { label: 'Starter',    amount: 5000,  dailyLimit: 50    },
  pro:        { label: 'Pro',        amount: 15000, dailyLimit: 200   },
  enterprise: { label: 'Enterprise', amount: 50000, dailyLimit: 1000  },
}
