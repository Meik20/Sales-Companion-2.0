import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'
import { createUserNotification } from '@/lib/user-notifications'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

/**
 * POST /api/support/sm-revocation
 *
 * Route sécurisée permettant à un Senior Manager de soumettre une demande
 * formelle de révocation d'un autre Senior Manager auprès du Support de SALES COMPANION 2.0.
 *
 * Invariant de gouvernance (AGENTS.md Section 1 & 12) :
 * - Aucun Senior Manager ne peut révoquer unilatéralement un pair.
 * - La demande génère un ticket de gouvernance haute priorité dans support_threads.
 * - Le Support étudie le dossier et prend attache avec la Direction Générale / mandataires
 *   sociaux de l'entreprise concernée avant toute validation ou rejet.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.split(' ')[1]
    if (!authHeader) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 })
    }

    let decodedToken: any
    try {
      decodedToken = await adminAuth.verifyIdToken(authHeader)
    } catch {
      return NextResponse.json({ message: 'Session invalide ou expirée' }, { status: 401 })
    }

    const callerUid = decodedToken.uid

    // ── 1. Vérifier les droits du demandeur (Senior Manager) ──────────────
    const callerDoc = await adminDb.collection('users').doc(callerUid).get()
    if (!callerDoc.exists) {
      return NextResponse.json({ message: 'Utilisateur demandeur introuvable' }, { status: 404 })
    }

    const callerData = callerDoc.data() || {}
    const callerRole = callerData.role
    const callerOrgRole = callerData.orgRole

    if (callerRole !== 'manager' || callerOrgRole !== 'senior_manager') {
      return NextResponse.json(
        { message: 'Action réservée aux Senior Managers de l organisation' },
        { status: 403 }
      )
    }

    if (!hasActivePaidManagerAccess(callerData)) {
      return NextResponse.json(
        { message: 'Abonnement manager actif requis pour initier une demande de gouvernance' },
        { status: 403 }
      )
    }

    const orgCode = callerData.orgCode
    if (!orgCode) {
      return NextResponse.json(
        { message: 'Aucun code organisation associé à votre compte' },
        { status: 400 }
      )
    }

    // ── 2. Récupérer et valider le corps de la requête ────────────────────
    const body = await request.json().catch(() => ({}))
    const {
      targetSmUid,
      reason,
      executiveContactName,
      executiveContactEmail,
      executiveContactPhone,
      proposedSuccessorUid
    } = body

    if (!targetSmUid || typeof targetSmUid !== 'string') {
      return NextResponse.json(
        { message: 'Le Senior Manager cible est obligatoire' },
        { status: 400 }
      )
    }

    // Auto-révocation formellement interdite
    if (targetSmUid === callerUid) {
      return NextResponse.json(
        { message: 'Vous ne pouvez pas demander votre propre révocation' },
        { status: 400 }
      )
    }

    const trimmedReason = typeof reason === 'string' ? reason.trim() : ''
    if (trimmedReason.length < 10) {
      return NextResponse.json(
        { message: 'Le motif officiel de la demande doit contenir au moins 10 caractères' },
        { status: 400 }
      )
    }

    const trimmedExecName = typeof executiveContactName === 'string' ? executiveContactName.trim() : ''
    const trimmedExecEmail = typeof executiveContactEmail === 'string' ? executiveContactEmail.trim() : ''

    if (!trimmedExecName || !trimmedExecEmail || !trimmedExecEmail.includes('@')) {
      return NextResponse.json(
        { message: 'Les coordonnées valides de la Direction Générale / RH (Nom & Email) sont obligatoires' },
        { status: 400 }
      )
    }

    // ── 3. Vérifier le Senior Manager ciblé ────────────────────────────────
    const targetDoc = await adminDb.collection('users').doc(targetSmUid).get()
    if (!targetDoc.exists) {
      return NextResponse.json(
        { message: 'Le Senior Manager ciblé est introuvable' },
        { status: 404 }
      )
    }

    const targetData = targetDoc.data() || {}
    if (targetData.orgCode !== orgCode) {
      return NextResponse.json(
        { message: "Le Senior Manager ciblé n'appartient pas à votre organisation" },
        { status: 400 }
      )
    }

    if (targetData.role !== 'manager' || targetData.orgRole !== 'senior_manager') {
      return NextResponse.json(
        { message: "L'utilisateur ciblé n'est pas un Senior Manager" },
        { status: 400 }
      )
    }

    // ── 4. Récupérer les informations de l'organisation ───────────────────
    const orgDoc = await adminDb.collection('organisations').doc(orgCode).get()
    const orgData = orgDoc.data() || {}
    const companyName = orgData.companyName || callerData.companyName || callerData.company || 'Entreprise'

    // Vérifier si une demande est déjà en cours pour ce SM
    const existingSnap = await adminDb
      .collection('support_threads')
      .where('targetSmUid', '==', targetSmUid)
      .where('type', '==', 'sm_revocation_request')
      .where('status', '==', 'open')
      .get()

    if (!existingSnap.empty) {
      return NextResponse.json(
        {
          message:
            "Une demande de révocation est déjà en cours d'étude auprès du Support pour ce Senior Manager"
        },
        { status: 409 }
      )
    }

    const callerName = callerData.displayName || callerData.name || callerData.email || 'Senior Manager'
    const targetName = targetData.displayName || targetData.name || targetData.email || 'Senior Manager'
    const targetSegment = targetData.segment || 'Général'
    const now = FieldValue.serverTimestamp()

    // ── 5. Créer le ticket de gouvernance dans support_threads ────────────
    const threadRef = await adminDb.collection('support_threads').add({
      type: 'sm_revocation_request',
      status: 'open',
      priority: 'urgent',
      governanceStatus: 'pending_review',
      orgCode,
      companyName,
      userId: callerUid,
      userName: callerName,
      userEmail: callerData.email || '',
      phone: callerData.phone || '',
      targetSmUid,
      targetSmName: targetName,
      targetSmEmail: targetData.email || '',
      targetSmSegment: targetSegment,
      reason: trimmedReason,
      executiveContactName: trimmedExecName,
      executiveContactEmail: trimmedExecEmail,
      executiveContactPhone: typeof executiveContactPhone === 'string' ? executiveContactPhone.trim() : null,
      proposedSuccessorUid: typeof proposedSuccessorUid === 'string' ? proposedSuccessorUid.trim() : null,
      subject: `[GOUVERNANCE - RÉVOCATION SM] ${companyName} — Demande concernant ${targetName} (${targetSegment})`,
      lastMessage: `Demande de révocation pour le Senior Manager ${targetName} (${targetSegment}). Motif : ${trimmedReason}`,
      unreadByAdmin: true,
      unreadByUser: false,
      createdAt: now,
      updatedAt: now
    })

    // Message détaillé dans le fil de discussion support
    await threadRef.collection('messages').add({
      content: `DEMANDE FORMELLE DE RÉVOCATION DE SENIOR MANAGER\n\nOrganisation : ${companyName} (${orgCode})\nDemandeur : ${callerName} (${callerData.email})\n\nSenior Manager ciblé : ${targetName} (${targetData.email})\nSegment sous sa responsabilité : ${targetSegment}\n\nMotif officiel :\n${trimmedReason}\n\nContact Direction / Mandataire Social pour vérification :\n- Nom : ${trimmedExecName}\n- Email : ${trimmedExecEmail}\n- Téléphone : ${executiveContactPhone || 'Non renseigné'}\n\nRepreneur proposé par intérim pour les dossiers du segment : ${proposedSuccessorUid || 'Non renseigné'}\n\nCette demande est soumise à l'équipe Support de Sales Companion 2.0 pour audit, vérification statutaire auprès des dirigeants et arbitrage formel.`,
      senderId: callerUid,
      senderRole: 'user',
      createdAt: now
    })

    // Notification in-app au demandeur
    await createUserNotification({
      userId: callerUid,
      type: 'general',
      title: 'Demande de révocation transmise au Support',
      message: `Votre demande concernant le Senior Manager ${targetName} a bien été enregistrée (Dossier #${threadRef.id}). Notre équipe Support étudie la demande et prendra attache avec la Direction de votre entreprise.`,
      link: '/team'
    })

    return NextResponse.json({
      success: true,
      ticketId: threadRef.id,
      message:
        'Votre demande formelle de révocation a été transmise au Support de SALES COMPANION 2.0. Un échange sera mené avec les responsables de votre entreprise avant toute validation.'
    })
  } catch (error: any) {
    console.error('[POST /api/support/sm-revocation] error:', error)
    return NextResponse.json(
      { message: error?.message || 'Erreur interne lors de la soumission de la demande' },
      { status: 500 }
    )
  }
}
