export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/clients/[id]
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const doc = await adminDb.collection('clients').doc(id).get()
    if (!doc.exists) return NextResponse.json({ message: 'Client introuvable' }, { status: 404 })

    const data = doc.data() || {}
    const userDoc = await adminDb.collection('users').doc(uid).get()
    const userData = userDoc.data() || {}

    // Vérification des droits d'accès
    const isOwnerManager = data.managerUid === uid
    const isOrgSenior = userData.orgRole === 'senior_manager' && data.orgCode === userData.orgCode
    const isAdmin = userData.role === 'admin'
    const isAssignedMember = data.assignedTo === uid
    const isLinkedSupport =
      userData.role === 'support_agent' &&
      (data.managerUid === userData.managerUid ||
        (userData.linkedManagerUids && userData.linkedManagerUids.includes(data.managerUid)))

    if (!isOwnerManager && !isOrgSenior && !isAdmin && !isAssignedMember && !isLinkedSupport) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    return NextResponse.json({
      id: doc.id,
      ...data,
      concludedAt: data.concludedAt?.toDate?.()?.toISOString() ?? (typeof data.concludedAt === 'string' ? data.concludedAt : null),
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? (typeof data.createdAt === 'string' ? data.createdAt : null),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? (typeof data.updatedAt === 'string' ? data.updatedAt : null)
    })
  } catch (error) {
    console.error('[clients/[id] GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PATCH /api/clients/[id]
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const doc = await adminDb.collection('clients').doc(id).get()
    if (!doc.exists) return NextResponse.json({ message: 'Client introuvable' }, { status: 404 })

    const data = doc.data() || {}
    const userDoc = await adminDb.collection('users').doc(uid).get()
    const userData = userDoc.data() || {}

    // Les agents support ne peuvent pas modifier les informations patrimoniales de la base clients
    if (userData.role === 'support_agent') {
      return NextResponse.json({ message: 'Les agents support ne peuvent pas modifier directement la base clients du manager' }, { status: 403 })
    }

    const isOwnerManager = data.managerUid === uid
    const isOrgSenior = userData.orgRole === 'senior_manager' && data.orgCode === userData.orgCode
    const isAdmin = userData.role === 'admin'

    if (!isOwnerManager && !isOrgSenior && !isAdmin) {
      return NextResponse.json({ message: 'Accès refusé' }, { status: 403 })
    }

    if (userData.role === 'manager' && !hasActivePaidManagerAccess(userData)) {
      return NextResponse.json({ message: 'Abonnement Manager requis' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, any> = {
      updatedAt: Timestamp.now()
    }

    if (body.companyName !== undefined) updates.companyName = String(body.companyName).trim()
    if (body.contactName !== undefined) updates.contactName = String(body.contactName).trim()
    if (body.companyPhone !== undefined) updates.companyPhone = String(body.companyPhone).trim()
    if (body.companyEmail !== undefined) updates.companyEmail = String(body.companyEmail).trim()
    if (body.companyCity !== undefined) updates.companyCity = String(body.companyCity).trim()
    if (body.companySector !== undefined) updates.companySector = String(body.companySector).trim()
    if (body.address !== undefined) updates.address = String(body.address).trim()
    if (body.amount !== undefined) updates.amount = body.amount != null ? Number(body.amount) : null
    if (body.currency !== undefined) updates.currency = String(body.currency).trim()
    if (body.notes !== undefined) updates.notes = String(body.notes).trim()
    if (body.status !== undefined) updates.status = String(body.status).trim()

    await doc.ref.update(updates)
    const refreshed = await doc.ref.get()

    return NextResponse.json({ id: refreshed.id, ...refreshed.data() })
  } catch (error) {
    console.error('[clients/[id] PATCH]', error)
    return NextResponse.json({ message: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

/**
 * DELETE /api/clients/[id]
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const doc = await adminDb.collection('clients').doc(id).get()
    if (!doc.exists) return NextResponse.json({ message: 'Client introuvable' }, { status: 404 })

    const data = doc.data() || {}
    const userDoc = await adminDb.collection('users').doc(uid).get()
    const userData = userDoc.data() || {}

    // RÈGLE CRITIQUE : Un agent support ne peut JAMAIS supprimer un document de la collection 'clients'
    if (userData.role === 'support_agent') {
      return NextResponse.json(
        { message: 'Action interdite : un agent support ne peut pas supprimer un client de la base de données du manager' },
        { status: 403 }
      )
    }

    const isOwnerManager = data.managerUid === uid
    const isOrgSenior = userData.orgRole === 'senior_manager' && data.orgCode === userData.orgCode
    const isAdmin = userData.role === 'admin'

    if (!isOwnerManager && !isOrgSenior && !isAdmin) {
      return NextResponse.json({ message: 'Action non autorisée' }, { status: 403 })
    }

    await doc.ref.delete()
    return NextResponse.json({ success: true, message: 'Client supprimé' })
  } catch (error) {
    console.error('[clients/[id] DELETE]', error)
    return NextResponse.json({ message: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
