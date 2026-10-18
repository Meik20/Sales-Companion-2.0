import { FieldValue } from 'firebase-admin/firestore'

export type UserNotificationType =
  | 'prospect_transfer'
  | 'prospect_assignment'
  | 'deadline_reminder'
  | 'general'

export interface CreateUserNotificationParams {
  userId: string
  type: UserNotificationType
  title: string
  message: string
  link?: string
  metadata?: {
    count?: number
    senderUid?: string
    senderName?: string
    deadline?: string | null
    [key: string]: unknown
  }
}

/**
 * Crée une notification dans la collection `userNotifications` de Firestore.
 * Appelé côté serveur pour informer les commerciaux et managers (ex: assignation, transfert).
 * Non-bloquant : les erreurs sont loggées sans interrompre le flux principal.
 */
export async function createUserNotification(params: CreateUserNotificationParams): Promise<void> {
  try {
    const { adminDb } = await import('@/lib/firebase-admin')
    await adminDb.collection('userNotifications').add({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link ?? '/pipeline',
      metadata: params.metadata ?? {},
      read: false,
      createdAt: FieldValue.serverTimestamp()
    })
  } catch (err) {
    console.error('[createUserNotification] Erreur création notification:', err)
  }
}
