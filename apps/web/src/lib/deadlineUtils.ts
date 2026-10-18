/**
 * deadlineUtils.ts
 * Utilitaire de gestion des échéances (deadlines) et comptes à rebours pour les prospects assignés ou transférés.
 */

export type DeadlineStatus = 'fresh' | 'urgent' | 'overdue' | 'completed'

export interface DeadlineInfo {
  status: DeadlineStatus
  isOverdue: boolean
  isUrgent: boolean
  isCompleted: boolean
  hoursRemaining: number
  daysRemaining: number
  formattedTime: string
  badgeText: string
  color: string
  bgColor: string
  borderColor: string
}

/**
 * Analyse l'état d'une deadline pour un prospect.
 * @param deadlineStr - Date ISO de la deadline
 * @param pipelineStatus - Statut courant dans le pipeline ('prospection', 'negociation', 'conclue')
 * @param firstActionAt - Date ISO de la première interaction/contact si existante
 * @param lang - Langue courante ('fr' | 'en')
 */
export function getDeadlineInfo(
  deadlineStr?: string | null,
  pipelineStatus?: string | null,
  firstActionAt?: string | null,
  lang: string = 'fr'
): DeadlineInfo | null {
  if (!deadlineStr) return null

  const deadline = new Date(deadlineStr)
  if (isNaN(deadline.getTime())) return null

  const isEn = lang === 'en'
  const normalizedStatus = String(pipelineStatus || '').toLowerCase().trim()

  // Si le prospect est sorti de prospection (négociation ou conclue) ou si un contact a été pris
  const isCompleted =
    normalizedStatus === 'negociation' ||
    normalizedStatus === 'negotiation' ||
    normalizedStatus === 'conclue' ||
    normalizedStatus === 'conclusion' ||
    Boolean(firstActionAt)

  if (isCompleted) {
    return {
      status: 'completed',
      isOverdue: false,
      isUrgent: false,
      isCompleted: true,
      hoursRemaining: 0,
      daysRemaining: 0,
      formattedTime: isEn ? 'Contacted' : 'Pris en charge',
      badgeText: isEn ? 'Taken' : 'Pris en charge',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.3)'
    }
  }

  const now = Date.now()
  const diffMs = deadline.getTime() - now
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  // 1. En retard (Overdue)
  if (diffMs < 0) {
    const overdueDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    const overdueHours = Math.abs(diffHours)

    const text =
      overdueDays > 0
        ? isEn
          ? `Overdue (${overdueDays}d)`
          : `En retard (${overdueDays}j)`
        : isEn
          ? `Overdue (${overdueHours}h)`
          : `En retard (${overdueHours}h)`

    return {
      status: 'overdue',
      isOverdue: true,
      isUrgent: true,
      isCompleted: false,
      hoursRemaining: diffHours,
      daysRemaining: diffDays,
      formattedTime: text,
      badgeText: text,
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.35)'
    }
  }

  // 2. Urgent (Moins de 24 heures)
  if (diffHours <= 24) {
    const text =
      diffHours <= 1
        ? isEn
          ? 'Expires in < 1h'
          : 'Expire dans < 1h'
        : isEn
          ? `Expires in ${diffHours}h`
          : `Expire dans ${diffHours}h`

    return {
      status: 'urgent',
      isOverdue: false,
      isUrgent: true,
      isCompleted: false,
      hoursRemaining: diffHours,
      daysRemaining: diffDays,
      formattedTime: text,
      badgeText: text,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.14)',
      borderColor: 'rgba(245, 158, 11, 0.35)'
    }
  }

  // 3. Dans les temps (Fresh / > 24 heures)
  const text = isEn ? `${diffDays}d left` : `${diffDays}j restants`

  return {
    status: 'fresh',
    isOverdue: false,
    isUrgent: false,
    isCompleted: false,
    hoursRemaining: diffHours,
    daysRemaining: diffDays,
    formattedTime: text,
    badgeText: text,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)'
  }
}
