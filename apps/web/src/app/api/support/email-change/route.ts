import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/support/email-change
 *
 * Route sécurisée permettant EXCLUSIVEMENT au SM1 (initiateur technique de l'organisation,
 * `organisations/{orgCode}.seniorManagerUid === callerUid`) de soumettre une demande
 * formelle de modification de son adresse e-mail auprès du Support de Sales Companion 2.0,
 * soumise à validation après avis favorable du Management de l'organisation.
 *
 * Ni le Manager Exécutif, ni les Coordinateurs invités, ni les Superviseurs,
 * ni les Commerciaux, ni les Agents Support ne peuvent initier cette demande.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.split(' ')[1]
    if (!authHeader) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 })
    }

    let decodedToken: { uid: string; email?: string }
    try {
      decodedToken = await adminAuth.verifyIdToken(authHeader)
    } catch {
      return NextResponse.json({ message: 'Session invalide ou expirée' }, { status: 401 })
    }

    const callerUid = decodedToken.uid

    // ── 1. Vérifier le profil du demandeur ──────────────────────────────────
    const callerDoc = await adminDb.collection('users').doc(callerUid).get()
    if (!callerDoc.exists) {
      return NextResponse.json({ message: 'Utilisateur introuvable' }, { status: 404 })
    }

    const callerData = callerDoc.data() || {}
    const callerRole = callerData.role
    const callerOrgRole = callerData.orgRole
    const orgCode = callerData.orgCode

    if (callerRole !== 'manager' || callerOrgRole !== 'senior_manager' || !orgCode) {
      return NextResponse.json(
        {
          message:
            "Action strictement réservée au Coordinateur principal (SM1) de l'organisation."
        },
        { status: 403 }
      )
    }

    // ── 2. Vérifier l'identité stricte du SM1 sur le document organisation ──
    const orgDoc = await adminDb.collection('organisations').doc(orgCode).get()
    if (!orgDoc.exists) {
      return NextResponse.json({ message: 'Organisation introuvable' }, { status: 404 })
    }

    const orgData = orgDoc.data() || {}
    if (orgData.seniorManagerUid !== callerUid) {
      return NextResponse.json(
        {
          message:
            "Seul le Coordinateur principal (SM1) initiateur de l'organisation peut demander une modification d'adresse e-mail."
        },
        { status: 403 }
      )
    }

    if (!hasActivePaidManagerAccess(callerData)) {
      return NextResponse.json(
        { message: 'Abonnement manager actif requis pour initier cette demande.' },
        { status: 403 }
      )
    }

    // ── 3. Valider les paramètres de la demande ─────────────────────────────
    const body = await request.json().catch(() => ({}))
    const rawNewEmail = typeof body.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : ''
    const trimmedReason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const trimmedMgmtName =
      typeof body.managementContactName === 'string' ? body.managementContactName.trim() : ''
    const trimmedMgmtEmail =
      typeof body.managementContactEmail === 'string'
        ? body.managementContactEmail.trim().toLowerCase()
        : ''
    const trimmedMgmtPhone =
      typeof body.managementContactPhone === 'string' ? body.managementContactPhone.trim() : ''

    if (!rawNewEmail || !EMAIL_REGEX.test(rawNewEmail)) {
      return NextResponse.json(
        { message: 'Veuillez saisir une nouvelle adresse e-mail valide.' },
        { status: 400 }
      )
    }

    const currentEmail = (callerData.email || decodedToken.email || '').trim().toLowerCase()
    if (rawNewEmail === currentEmail) {
      return NextResponse.json(
        { message: "La nouvelle adresse e-mail doit être différente de l'adresse actuelle." },
        { status: 400 }
      )
    }

    if (trimmedReason.length < 10) {
      return NextResponse.json(
        { message: 'Le motif officiel de la demande doit contenir au moins 10 caractères.' },
        { status: 400 }
      )
    }

    if (!trimmedMgmtName || !trimmedMgmtEmail || !EMAIL_REGEX.test(trimmedMgmtEmail)) {
      return NextResponse.json(
        {
          message:
            "Les coordonnées valides du Management de l'organisation (Nom & Email) sont obligatoires pour recueillir son avis favorable."
        },
        { status: 400 }
      )
    }

    // ── 4. Vérifier la disponibilité du nouvel e-mail dans Firebase Auth ────
    try {
      await adminAuth.getUserByEmail(rawNewEmail)
      return NextResponse.json(
        { message: 'Cette adresse e-mail est déjà associée à un autre compte.' },
        { status: 409 }
      )
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code && code !== 'auth/user-not-found') {
        throw err
      }
    }

    // ── 5. Vérifier qu'aucune demande n'est déjà ouverte pour ce SM1 ────────
    const existingSnap = await adminDb
      .collection('support_threads')
      .where('userId', '==', callerUid)
      .where('type', '==', 'email_change_request')
      .where('status', '==', 'open')
      .get()

    if (!existingSnap.empty) {
      return NextResponse.json(
        {
          message:
            "Une demande de modification d'adresse e-mail est déjà en cours d'étude auprès du Support."
        },
        { status: 409 }
      )
    }

    const companyName =
      orgData.companyName || callerData.companyName || callerData.company || 'Entreprise'
    const callerName = callerData.displayName || callerData.name || currentEmail || 'SM1'
    const now = FieldValue.serverTimestamp()

    // ── 6. Créer le ticket de gouvernance dans support_threads ──────────────
    const threadRef = await adminDb.collection('support_threads').add({
      type: 'email_change_request',
      status: 'open',
      priority: 'urgent',
      governanceStatus: 'pending_review',
      emailChangeStatus: 'pending',
      orgCode,
      companyName,
      userId: callerUid,
      userName: callerName,
      userEmail: currentEmail,
      phone: callerData.phone || '',
      requestedNewEmail: rawNewEmail,
      reason: trimmedReason,
      managementContactName: trimmedMgmtName,
      managementContactEmail: trimmedMgmtEmail,
      managementContactPhone: trimmedMgmtPhone || null,
      subject: `[GOUVERNANCE - MODIFICATION EMAIL SM1] ${companyName} – ${currentEmail} → ${rawNewEmail}`,
      lastMessage: `Demande de changement d'e-mail du SM1 (${currentEmail} → ${rawNewEmail}). En attente d'avis favorable du Management et validation Support.`,
      unreadByAdmin: true,
      unreadByUser: false,
      createdAt: now,
      updatedAt: now
    })

    await threadRef.collection('messages').add({
      content: `DEMANDE FORMELLE DE MODIFICATION D'ADRESSE E-MAIL (SM1)\n\nOrganisation : ${companyName} (${orgCode})\nDemandeur (SM1) : ${callerName}\nAdresse actuelle : ${currentEmail}\nNouvelle adresse demandée : ${rawNewEmail}\n\nMotif officiel :\n${trimmedReason}\n\nContact du Management de l'organisation pour avis favorable :\n- Nom : ${trimmedMgmtName}\n- Email : ${trimmedMgmtEmail}\n- Téléphone : ${trimmedMgmtPhone || 'Non renseigné'}\n\nCette demande est soumise au Support de Sales Companion 2.0 pour vérification et validation après avis favorable du Management de l'organisation.`,
      senderId: callerUid,
      senderRole: 'user',
      createdAt: now
    })

    return NextResponse.json({
      success: true,
      threadId: threadRef.id,
      message: 'Demande transmise au Support de Sales Companion 2.0.'
    })
  } catch (error) {
    console.error('[POST /api/support/email-change]', error)
    return NextResponse.json(
      { message: 'Erreur serveur lors de la création de la demande.' },
      { status: 500 }
    )
  }
}
