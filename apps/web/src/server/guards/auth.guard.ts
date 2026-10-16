// apps/web/src/server/guards/auth.guard.ts
// Guards d'authentification et de permissions serveur (Zero-trust multi-tenant)
import { NextRequest } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export interface ServerSession {
  uid: string
  email?: string
  role: 'independent' | 'manager' | 'member' | 'support_agent' | 'admin'
  orgRole?: 'senior_manager' | 'team_manager'
  orgCode?: string | null
  seniorManagerUid?: string | null
  managerUid?: string | null
  segment?: string | null
  active: boolean
  activated: boolean
  emailVerified: boolean
  userData: Record<string, any>
}

export class AuthGuardError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.name = 'AuthGuardError'
    this.status = status
  }
}

/**
 * Extrait le token Bearer, vérifie l'identité via Firebase Auth Admin,
 * et charge le profil utilisateur Firestore correspondant.
 */
export async function authenticateServerRequest(request: NextRequest): Promise<ServerSession> {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    throw new AuthGuardError('Non authentifié (aucun token Bearer fourni)', 401)
  }

  let decodedToken
  try {
    decodedToken = await adminAuth.verifyIdToken(token)
  } catch {
    throw new AuthGuardError('Session invalide ou expirée', 401)
  }

  const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
  if (!userDoc.exists) {
    throw new AuthGuardError('Profil utilisateur introuvable', 404)
  }

  const userData = userDoc.data() || {}
  const isMemberByInvitation =
    userData.role === 'member' && userData.activated === true && userData.active === true

  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    role: userData.role,
    orgRole: userData.orgRole,
    orgCode: userData.orgCode || null,
    seniorManagerUid: userData.seniorManagerUid || null,
    managerUid: userData.managerUid || null,
    segment: userData.segment || null,
    active: Boolean(userData.active),
    activated: Boolean(userData.activated),
    emailVerified: isMemberByInvitation ? true : Boolean(userData.emailVerified || decodedToken.email_verified),
    userData
  }
}

/**
 * Garantit que l'utilisateur est un Manager avec un abonnement actif et vérifié.
 */
export function assertManagerWithActivePlan(session: ServerSession): void {
  if (session.role !== 'manager') {
    throw new AuthGuardError('Accès réservé aux managers', 403)
  }
  if (!hasActivePaidManagerAccess(session.userData)) {
    throw new AuthGuardError('Un abonnement Manager actif et vérifié est requis.', 403)
  }
}

/**
 * Garantit que l'utilisateur est le Senior Manager de son organisation (vérification de rôle pour consultation).
 * Permet au Senior Manager de consulter son organisation et son pipeline même si son plan est repassé en FREE.
 */
export function assertSeniorManagerRole(session: ServerSession): void {
  if (session.role !== 'manager') {
    throw new AuthGuardError('Accès réservé aux managers', 403)
  }
  if (session.orgRole !== 'senior_manager') {
    throw new AuthGuardError("Accès réservé au Senior Manager de l'organisation", 403)
  }
  if (!session.orgCode) {
    throw new AuthGuardError('Aucun code organisation rattaché', 400)
  }
}

/**
 * Garantit que l'utilisateur est le Senior Manager de son organisation AVEC un abonnement actif.
 * Requis pour les actions de gouvernance et de gestion payantes (invitations, transferts, assignations).
 */
export function assertSeniorManager(session: ServerSession): void {
  assertSeniorManagerRole(session)
  if (!hasActivePaidManagerAccess(session.userData)) {
    throw new AuthGuardError('Un abonnement Manager actif et vérifié est requis.', 403)
  }
}

/**
 * Garantit que deux entités appartiennent strictement au même orgCode.
 */
export function assertSameOrg(session: ServerSession, targetOrgCode?: string | null): void {
  if (!session.orgCode || !targetOrgCode || session.orgCode !== targetOrgCode) {
    throw new AuthGuardError("Action interdite : violation du périmètre de l'organisation", 403)
  }
}
