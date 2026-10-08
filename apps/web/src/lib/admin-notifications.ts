import { FieldValue } from 'firebase-admin/firestore'

export type AdminNotificationType = 'payment_submitted' | 'new_manager' | 'support_ticket'

interface CreateNotificationParams {
  type: AdminNotificationType
  title: string
  message: string
  userId: string
  userEmail: string
  reference?: string
  /** Route interne vers la page admin concernée (ex: '/admin/payments') */
  link?: string
}

/**
 * Crée une notification dans la collection `adminNotifications` de Firestore.
 * Appelé côté serveur (routes API) pour les événements nécessitant une action admin.
 * La lecture est en temps réel côté client via onSnapshot.
 *
 * Non-bloquant — les erreurs sont loggées sans faire échouer la réponse principale.
 * Utilise un import dynamique de firebase-admin pour éviter les échecs d'initialisation
 * au chargement du module dans les contextes serverless (Vercel Edge Functions).
 */
export async function createAdminNotification(params: CreateNotificationParams): Promise<void> {
  try {
    // Import dynamique pour éviter les problèmes d'initialisation au chargement du module
    const { adminDb } = await import('@/lib/firebase-admin')
    await adminDb.collection('adminNotifications').add({
      type: params.type,
      title: params.title,
      message: params.message,
      userId: params.userId,
      userEmail: params.userEmail,
      reference: params.reference ?? null,
      link: params.link ?? null,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    })
  } catch (err) {
    // Non-bloquant : la notification échouée ne doit pas impacter la réponse principale
    console.error('[createAdminNotification] Failed to create notification:', err)
  }
}
