import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { verifyAdminCached } from '@/lib/api-admin-auth'
import { createUserNotification } from '@/lib/user-notifications'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/support/email-change
 * Permet à l'équipe Support / Admin de Sales Companion 2.0 de valider ou rejeter
 * une demande de modification d'adresse e-mail du SM1 après avis du Management.
 */
export async function POST(request: NextRequest) {
  try {
    const tokenHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    await verifyAdminCached(tokenHeader)

    const body = await request.json().catch(() => ({}))
    const { threadId, action, rejectionReason } = body as {
      threadId?: string
      action?: 'approve' | 'reject'
      rejectionReason?: string
    }

    if (!threadId || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json(
        { error: 'threadId et action (approve | reject) requis.' },
        { status: 400 }
      )
    }

    const threadRef = adminDb.collection('support_threads').doc(threadId)
    const threadDoc = await threadRef.get()
    if (!threadDoc.exists) {
      return NextResponse.json({ error: 'Ticket introuvable.' }, { status: 404 })
    }

    const threadData = threadDoc.data() || {}
    if (threadData.type !== 'email_change_request') {
      return NextResponse.json(
        { error: "Ce ticket n'est pas une demande de modification d'e-mail." },
        { status: 400 }
      )
    }

    if (threadData.emailChangeStatus && threadData.emailChangeStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Cette demande a déjà été traitée.' },
        { status: 409 }
      )
    }

    const userId = threadData.userId as string
    const newEmail = (threadData.requestedNewEmail || '').trim().toLowerCase()
    const now = FieldValue.serverTimestamp()

    if (action === 'approve') {
      if (!userId || !newEmail) {
        return NextResponse.json(
          { error: 'Données utilisateur ou nouvel e-mail manquants sur le ticket.' },
          { status: 400 }
        )
      }

      // Vérifier une dernière fois la disponibilité de l'e-mail
      try {
        const existing = await adminAuth.getUserByEmail(newEmail)
        if (existing && existing.uid !== userId) {
          return NextResponse.json(
            { error: 'Cette adresse e-mail est déjà utilisée par un autre compte.' },
            { status: 409 }
          )
        }
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code
        if (code && code !== 'auth/user-not-found') {
          throw err
        }
      }

      // Mettre à jour Firebase Auth + Firestore users/{uid}
      await adminAuth.updateUser(userId, {
        email: newEmail,
        emailVerified: true
      })

      await adminDb.collection('users').doc(userId).update({
        email: newEmail,
        updatedAt: now
      })

      const chatMessage = `✅ [Validation Support] Après avis favorable du Management de votre organisation, votre demande de modification d'adresse e-mail a été validée.\n\nVotre nouvelle adresse e-mail de connexion est désormais : ${newEmail}`

      await threadRef.collection('messages').add({
        content: chatMessage,
        senderId: 'admin',
        senderRole: 'admin',
        createdAt: now
      })

      await threadRef.update({
        status: 'resolved',
        governanceStatus: 'approved',
        emailChangeStatus: 'approved',
        emailChangeApprovedAt: now,
        lastMessage: `Adresse e-mail mise à jour vers ${newEmail}.`,
        unreadByUser: true,
        unreadByAdmin: false,
        updatedAt: now
      })

      await createUserNotification({
        userId,
        type: 'general',
        title: 'Adresse e-mail mise à jour',
        message: `Votre demande a été validée par le Support. Votre nouvelle adresse e-mail est ${newEmail}.`,
        link: `/support?ticket=${threadId}`
      }).catch(() => {})

      return NextResponse.json({ success: true, status: 'approved', newEmail })
    }

    // action === 'reject'
    const reasonText =
      typeof rejectionReason === 'string' && rejectionReason.trim()
        ? rejectionReason.trim()
        : "Avis favorable du Management non confirmé ou informations insuffisantes."

    await threadRef.collection('messages').add({
      content: `❌ [Décision Support] Votre demande de modification d'adresse e-mail vers ${newEmail} n'a pas pu être validée.\n\nMotif : ${reasonText}`,
      senderId: 'admin',
      senderRole: 'admin',
      createdAt: now
    })

    await threadRef.update({
      status: 'resolved',
      governanceStatus: 'rejected',
      emailChangeStatus: 'rejected',
      emailChangeRejectedReason: reasonText,
      lastMessage: 'Demande de modification d’adresse e-mail refusée.',
      unreadByUser: true,
      unreadByAdmin: false,
      updatedAt: now
    })

    await createUserNotification({
      userId,
      type: 'general',
      title: "Demande de modification d'e-mail refusée",
      message: `Motif : ${reasonText}`,
      link: `/support?ticket=${threadId}`
    }).catch(() => {})

    return NextResponse.json({ success: true, status: 'rejected' })
  } catch (error) {
    console.error('[POST /api/admin/support/email-change]', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors du traitement de la demande.' },
      { status: 500 }
    )
  }
}
