import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * PATCH /api/crm/tickets/[id]
 * Update ticket status or other fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { adminDb, adminAuth } = await getAdmin()
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let uid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      uid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const userDoc = await adminDb.collection('users').doc(uid).get()
    const userData = userDoc.data()
    if (!userData || !['support_agent', 'manager', 'admin'].includes(userData.role)) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { status, priority, description } = body

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
    const validPriorities = ['low', 'medium', 'high', 'urgent']

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (status && validStatuses.includes(status)) updates.status = status
    if (priority && validPriorities.includes(priority)) updates.priority = priority
    if (description !== undefined) updates.description = description

    await adminDb.collection('customer_tickets').doc(id).update(updates)


    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[crm/tickets PATCH]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
