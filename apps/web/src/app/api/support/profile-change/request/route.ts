import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

/**
 * POST /api/support/profile-change/request
 * Permet à un utilisateur Manager de créer une demande de modification de profil au support.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    if (!authHeader) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = await adminAuth.verifyIdToken(authHeader)
    } catch {
      return NextResponse.json({ error: 'Session invalide ou expirée.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const userReason = typeof body.reason === 'string' ? body.reason.trim() : ''

    // Récupérer les données de l'utilisateur
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get()
    const userData = userDoc.data() || {}

    const userName = userData.name || decoded.name || 'Utilisateur'
    const userEmail = (userData.email || decoded.email || '').toLowerCase()
    const companyName = userData.company || userData.companyName || ''
    const sector = userData.sector || userData.industry || ''
    const phone = userData.phone || ''

    const now = FieldValue.serverTimestamp()

    const subject = `Demande de modification de profil - ${userName} (${companyName || 'Entreprise'})`

    // 1. Créer le ticket dans support_threads
    const threadRef = await adminDb.collection('support_threads').add({
      userId: decoded.uid,
      userName,
      userEmail,
      companyName,
      sector,
      phone,
      subject,
      type: 'profile_change_request',
      status: 'open',
      profileChangeStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      lastMessage: userReason || "Demande d'autorisation de modification des informations d'entreprise/profil.",
      unreadByAdmin: true,
      unreadByUser: false
    })

    // 2. Créer le premier message dans la sous-collection messages
    const initialContent = userReason
      ? `Bonjour,\n\nJe souhaite modifier les informations de mon profil d'entreprise (${companyName || 'Mon entreprise'}).\n\nMotif / Précisions :\n${userReason}\n\nMerci de bien vouloir m'autoriser la mise à jour.`
      : `Bonjour,\n\nJe souhaite modifier les informations de mon profil d'entreprise (${companyName || 'Mon entreprise'}).\n\nMerci de bien vouloir autoriser la mise à jour de mon profil.`

    await threadRef.collection('messages').add({
      content: initialContent,
      senderId: decoded.uid,
      senderRole: 'user',
      createdAt: now
    })

    return NextResponse.json({
      success: true,
      threadId: threadRef.id,
      message: 'Demande créée avec succès.'
    })
  } catch (error: any) {
    console.error('Erreur demande modification profil:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la demande.' },
      { status: 500 }
    )
  }
}
