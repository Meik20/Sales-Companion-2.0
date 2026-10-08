/**
 * subscriptionStatus.ts
 * Utilitaire partagé : calcule la validité dynamique d'un abonnement
 * et retourne couleur, label et progression selon les jours restants.
 */

export type SubscriptionStatusLevel =
  | 'none' // Plan FREE ou pas de date
  | 'safe' // > 30 jours
  | 'warning' // 15–30 jours
  | 'alert' // 7–14 jours
  | 'critical' // 1–6 jours
  | 'expired' // 0 ou négatif

export type SubscriptionStatus = {
  level: SubscriptionStatusLevel
  daysLeft: number
  color: string // couleur principale (texte / barre)
  bgColor: string // couleur de fond semi-transparente
  borderColor: string // couleur de bordure semi-transparente
  label: string // ex: "24 j restants"
  shortLabel: string // ex: "24j"
  dateLabel: string // date formatée fr-FR
  percent: number // 0-100, progression restante (100 = plein, 0 = vide)
}

/** Seuils en jours */
const THRESHOLDS = {
  safe: 30,
  warning: 15,
  alert: 7,
  critical: 1
}

/**
 * Calcule le statut d'abonnement à partir de la date d'expiration ISO.
 * @param expiresAt  - ISO string ou null
 * @param plan       - plan utilisateur
 * @param maxDays    - durée max référence pour la barre (default: 365)
 */
export function getSubscriptionStatus(
  expiresAt: string | null | undefined,
  plan: string,
  maxDays = 365
): SubscriptionStatus {
  // Plan FREE ou pas de date → affichage neutre
  if (!expiresAt || plan === 'free') {
    return {
      level: 'none',
      daysLeft: 0,
      color: 'var(--muted-foreground, #94a3b8)',
      bgColor: 'rgba(148,163,184,0.08)',
      borderColor: 'rgba(148,163,184,0.2)',
      label: '—',
      shortLabel: '—',
      dateLabel: '—',
      percent: 0
    }
  }

  const now = Date.now()
  const expiry = new Date(expiresAt).getTime()
  const msLeft = expiry - now
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))

  const dateLabel = new Date(expiresAt).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  // Cas expiré
  if (daysLeft <= 0) {
    return {
      level: 'expired',
      daysLeft: 0,
      color: '#ef4444',
      bgColor: 'rgba(239,68,68,0.1)',
      borderColor: 'rgba(239,68,68,0.3)',
      label: 'Expiré',
      shortLabel: 'Expiré',
      dateLabel,
      percent: 0
    }
  }

  // Calcul du pourcentage restant (plafonné à 100%)
  const percent = Math.min(100, Math.round((daysLeft / maxDays) * 100))

  if (daysLeft > THRESHOLDS.safe) {
    return {
      level: 'safe',
      daysLeft,
      color: '#10b981',
      bgColor: 'rgba(16,185,129,0.1)',
      borderColor: 'rgba(16,185,129,0.25)',
      label: `${daysLeft} j restants`,
      shortLabel: `${daysLeft}j`,
      dateLabel,
      percent
    }
  }

  if (daysLeft > THRESHOLDS.warning) {
    return {
      level: 'warning',
      daysLeft,
      color: '#f59e0b',
      bgColor: 'rgba(245,158,11,0.1)',
      borderColor: 'rgba(245,158,11,0.25)',
      label: `${daysLeft} j restants`,
      shortLabel: `${daysLeft}j`,
      dateLabel,
      percent
    }
  }

  if (daysLeft > THRESHOLDS.alert) {
    return {
      level: 'alert',
      daysLeft,
      color: '#f97316',
      bgColor: 'rgba(249,115,22,0.1)',
      borderColor: 'rgba(249,115,22,0.25)',
      label: `${daysLeft} j restants`,
      shortLabel: `${daysLeft}j`,
      dateLabel,
      percent
    }
  }

  // 1–6 jours (critical)
  return {
    level: 'critical',
    daysLeft,
    color: '#ef4444',
    bgColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)',
    label: `${daysLeft} j restants`,
    shortLabel: `${daysLeft}j`,
    dateLabel,
    percent
  }
}
