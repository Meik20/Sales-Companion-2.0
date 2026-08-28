import { NextResponse } from 'next/server'
import { createAdminNotification } from '@/lib/admin-notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/support/notify
 * Déclenche une notification admin lors de la création d'un nouveau ticket support
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { threadId, subject, userName, userEmail, userId } = body

    if (!threadId || !subject) {
      return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 })
    }

    await createAdminNotification({
      type: 'support_ticket',
      title: '🎧 Nouveau ticket support',
      message: `${userName || userEmail || 'Utilisateur'} : ${subject}`,
      userId: userId || 'user',
      userEmail: userEmail || '',
      reference: threadId,
      link: '/admin/support'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[support/notify POST]', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
