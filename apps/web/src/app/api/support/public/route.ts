import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb } = await import('@/lib/firebase-admin')
  return { adminDb }
}

/**
 * POST /api/support/public
 * Permet à un utilisateur (même non connecté ou sans compte d'entreprise)
 * de soumettre un ticket / demande directement vers le support admin.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, company, sector, phone, subject, message, type } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Une adresse email valide est obligatoire.' }, { status: 400 })
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Le message est obligatoire.' }, { status: 400 })
    }

    const { adminDb } = await getAdmin()

    const sanitizedName = name.trim()
    const sanitizedEmail = email.trim().toLowerCase()
    const sanitizedCompany = typeof company === 'string' ? company.trim() : ''
    const sanitizedSector = typeof sector === 'string' ? sector.trim() : ''
    const sanitizedPhone = typeof phone === 'string' ? phone.trim() : ''
    const requestType = type || 'corporate_domain_request'
    const defaultSubject =
      requestType === 'corporate_domain_request'
        ? `Demande de compte Manager sans domaine - ${sanitizedCompany || sanitizedName}`
        : `Demande de contact - ${sanitizedName}`
    const sanitizedSubject = typeof subject === 'string' && subject.trim() ? subject.trim() : defaultSubject
    const sanitizedMessage = message.trim()

    const now = FieldValue.serverTimestamp()

    // 1. Création du thread de support
    const threadRef = await adminDb.collection('support_threads').add({
      userId: 'guest_unregistered',
      userName: sanitizedName,
      userEmail: sanitizedEmail,
      companyName: sanitizedCompany,
      sector: sanitizedSector,
      phone: sanitizedPhone,
      subject: sanitizedSubject,
      type: requestType,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      lastMessage: sanitizedMessage.slice(0, 120),
      unreadByAdmin: true,
      unreadByUser: false,
      isGuest: true,
      origin: 'public_support_form'
    })

    // 2. Création du premier message dans la sous-collection messages
    const formattedContent = [
      `[Demande reçue via le Formulaire Support Public]`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 Nom : ${sanitizedName}`,
      `📧 Email : ${sanitizedEmail}`,
      sanitizedCompany ? `🏢 Entreprise : ${sanitizedCompany}` : null,
      sanitizedPhone ? `📱 Téléphone / WhatsApp : ${sanitizedPhone}` : null,
      sanitizedSector ? `🏷️ Secteur : ${sanitizedSector}` : null,
      `📌 Motif : ${requestType === 'corporate_domain_request' ? 'Dérogation domaine entreprise (Compte Manager)' : requestType}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      sanitizedMessage
    ]
      .filter(Boolean)
      .join('\n')

    await threadRef.collection('messages').add({
      content: formattedContent,
      senderId: 'guest_unregistered',
      senderRole: 'user',
      createdAt: now
    })

    return NextResponse.json({
      success: true,
      threadId: threadRef.id,
      message: 'Demande enregistrée avec succès.'
    })
  } catch (error) {
    console.error('[support/public POST]', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la transmission de votre requête.' },
      { status: 500 }
    )
  }
}
