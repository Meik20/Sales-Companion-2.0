import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/support/public
 * Permet à un utilisateur (même non connecté ou sans compte d'entreprise)
 * de soumettre un ticket / demande directement vers le support admin.
 * Protégé contre le spam par rate-limiting, honeypot et validation stricte.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const ipLimit = await checkRateLimit(`support-public:${ip}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000 // 5 demandes max par 15 minutes
    })
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes envoyées. Veuillez patienter avant de soumettre une nouvelle demande.' },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    const { name, email, company, sector, phone, subject, message, type, _gotcha, hp, website_url_hp } = body as Record<string, unknown>

    // ── Honeypot bot trap ──────────────────────────────────────────
    if (_gotcha || hp || website_url_hp) {
      // Bot detected — simulate success without writing to Firestore
      return NextResponse.json({ success: true, message: 'Demande enregistrée avec succès.' })
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 })
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Le nom est trop long (maximum 100 caractères).' }, { status: 400 })
    }

    if (!email || typeof email !== 'string' || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Une adresse email valide est obligatoire.' }, { status: 400 })
    }
    if (email.trim().length > 120) {
      return NextResponse.json({ error: "L'adresse email est trop longue (maximum 120 caractères)." }, { status: 400 })
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Le message est obligatoire.' }, { status: 400 })
    }
    if (message.trim().length < 5) {
      return NextResponse.json({ error: 'Le message est trop court (minimum 5 caractères).' }, { status: 400 })
    }
    if (message.trim().length > 3000) {
      return NextResponse.json({ error: 'Le message est trop long (maximum 3000 caractères).' }, { status: 400 })
    }

    const { adminDb } = await import('@/lib/firebase-admin')
    const { FieldValue } = await import('firebase-admin/firestore')

    const sanitizedName = name.trim().slice(0, 100)
    const sanitizedEmail = email.trim().toLowerCase().slice(0, 120)
    const sanitizedCompany = typeof company === 'string' ? company.trim().slice(0, 100) : ''
    const sanitizedSector = typeof sector === 'string' ? sector.trim().slice(0, 100) : ''
    const sanitizedPhone = typeof phone === 'string' ? phone.trim().slice(0, 30) : ''
    const requestType = (typeof type === 'string' ? type.slice(0, 50) : '') || 'corporate_domain_request'
    const defaultSubject =
      requestType === 'corporate_domain_request'
        ? `Demande de compte Manager sans domaine - ${sanitizedCompany || sanitizedName}`
        : `Demande de contact - ${sanitizedName}`
    const sanitizedSubject = typeof subject === 'string' && subject.trim() ? subject.trim().slice(0, 200) : defaultSubject
    const sanitizedMessage = message.trim().slice(0, 3000)

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

    // 3. Activer la notification temps réel pour l'administrateur (best-effort)
    try {
      const { createAdminNotification } = await import('@/lib/admin-notifications')
      await createAdminNotification({
        type: 'support_ticket',
        title:
          requestType === 'corporate_domain_request'
            ? '🏢 Demande dérogation domaine Manager'
            : '🎧 Nouveau ticket support public',
        message: `${sanitizedName}${sanitizedCompany ? ` (${sanitizedCompany})` : ''} : ${sanitizedSubject}`,
        userId: 'guest_unregistered',
        userEmail: sanitizedEmail,
        reference: threadRef.id,
        link: '/admin/support'
      })
    } catch (notifErr) {
      console.warn('[support/public POST] Erreur non-bloquante lors de la notification admin:', notifErr)
    }

    return NextResponse.json({
      success: true,
      threadId: threadRef.id,
      message: 'Demande enregistrée avec succès.'
    })
  } catch (error: any) {
    console.error('[support/public POST]', error)
    return NextResponse.json(
      { error: error?.message || 'Une erreur est survenue lors de la transmission de votre requête.' },
      { status: 500 }
    )
  }
}
