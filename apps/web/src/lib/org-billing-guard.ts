import { adminDb } from '@/lib/firebase-admin'

/**
 * Vérifie si un utilisateur authentifié est habilité à initier ou soumettre un paiement.
 * Règle métier : au sein d'une organisation, seul l'initiateur principal (SM1)
 * a accès à la facturation et à l'interface /upgrade.
 */
export async function assertCanManageBilling(
  uid: string
): Promise<{ allowed: boolean; reason?: string }> {
  const userSnap = await adminDb.collection('users').doc(uid).get()
  if (!userSnap.exists) {
    return { allowed: true }
  }

  const userData = userSnap.data()
  if (userData?.role !== 'manager') {
    return { allowed: true }
  }

  const orgRole = userData?.orgRole
  if (orgRole === 'team_manager' || orgRole === 'executive') {
    return {
      allowed: false,
      reason: "Seul l'initiateur principal de l'organisation (SM1) peut gérer l'abonnement."
    }
  }

  if (userData?.isPrimarySeniorManager === false || Boolean(userData?.invitedByUid)) {
    return {
      allowed: false,
      reason: "Seul l'initiateur principal de l'organisation (SM1) peut gérer l'abonnement."
    }
  }

  const orgCode = userData?.orgCode
  if (orgCode) {
    const orgSnap = await adminDb.collection('organisations').doc(orgCode).get()
    const orgData = orgSnap.data()
    if (orgData?.seniorManagerUid && orgData.seniorManagerUid !== uid) {
      return {
        allowed: false,
        reason: "Seul l'initiateur principal de l'organisation (SM1) peut gérer l'abonnement."
      }
    }
  }

  return { allowed: true }
}
