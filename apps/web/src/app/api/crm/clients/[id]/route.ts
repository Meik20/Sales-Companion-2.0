export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * PATCH /api/crm/clients/[id]
 * Met à jour un client CRM existant
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { adminDb, adminAuth } = await getAdmin()
    const { id } = await params
    if (!id) return NextResponse.json({ message: 'ID requis' }, { status: 400 })

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let agentUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      agentUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const agentDoc = await adminDb.collection('users').doc(agentUid).get()
    const agentData = agentDoc.data()
    if (!agentData) return NextResponse.json({ message: 'Profil introuvable' }, { status: 404 })

    const body = await request.json()
    const now = Timestamp.now()

    // Chercher dans quelle collection se trouve le document
    let targetCollection = 'crm_clients'
    let docRef = adminDb.collection('crm_clients').doc(id)
    let snap = await docRef.get()

    if (!snap.exists) {
      docRef = adminDb.collection('pipeline').doc(id)
      snap = await docRef.get()
      if (snap.exists) {
        targetCollection = 'pipeline'
      } else {
        docRef = adminDb.collection('manager_prospects').doc(id)
        snap = await docRef.get()
        if (snap.exists) {
          targetCollection = 'manager_prospects'
        } else {
          return NextResponse.json({ message: 'Client introuvable' }, { status: 404 })
        }
      }
    }

    const prevData = snap.data() || {}
    const updates: Record<string, any> = {
      updatedAt: now
    }

    if (body.companyName !== undefined) updates.companyName = body.companyName.trim()
    if (body.contactName !== undefined) updates.contactName = body.contactName.trim()
    if (body.phone !== undefined) {
      updates.phone = body.phone.trim()
      updates.companyPhone = body.phone.trim()
    }
    if (body.email !== undefined) {
      updates.email = body.email.trim()
      updates.companyEmail = body.email.trim()
    }
    if (body.city !== undefined) {
      updates.city = body.city.trim()
      updates.companyCity = body.city.trim()
    }
    if (body.sector !== undefined) {
      updates.sector = body.sector.trim()
      updates.companySector = body.sector.trim()
    }
    if (body.address !== undefined) updates.address = body.address.trim()
    if (body.notes !== undefined) updates.notes = body.notes.trim()

    if (body.status !== undefined && body.status !== prevData.status) {
      const STATUS_LABELS: Record<string, string> = {
        new: 'Nouveau',
        to_contact: 'À contacter',
        contacted: 'Contacté',
        in_discussion: 'En discussion',
        proposal_sent: 'Proposition envoyée',
        won: 'Gagné',
        lost: 'Perdu',
        imported: 'Importé',
      }
      const statusLabel = STATUS_LABELS[body.status] ?? body.status

      updates.status = body.status
      updates.lastActivityAt = now
      updates.lastActivityType = 'status_change'
      updates.lastActivityTitle = `Statut : ${statusLabel}`

      // Tracer l'activité
      await adminDb.collection('crm_activities').add({
        clientId: id,
        type: 'status_change',
        title: 'Statut mis à jour',
        description: `Nouveau statut : ${body.status}`,
        performedBy: agentUid,
        performedByName: agentData.name || agentData.displayName || agentData.email,
        createdAt: now
      })
    }

    if (body.nextAction !== undefined) updates.nextAction = body.nextAction.trim()
    if (body.nextActionAt !== undefined) {
      updates.nextActionAt = body.nextActionAt ? Timestamp.fromDate(new Date(body.nextActionAt)) : null
    }

    await docRef.update(updates)

    return NextResponse.json({
      success: true,
      id,
      ...updates
    })
  } catch (error) {
    console.error('[crm/clients/[id] PATCH]', error)
    return NextResponse.json({ message: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

/**
 * DELETE /api/crm/clients/[id]
 * Supprime un client
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { adminDb, adminAuth } = await getAdmin()
    const { id } = await params

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const agentDoc = await adminDb.collection('users').doc(decoded.uid).get()
    const agentData = agentDoc.data()
    if (!agentData || !['admin', 'manager', 'support_agent'].includes(agentData.role)) {
      return NextResponse.json({ message: 'Action non autorisée' }, { status: 403 })
    }

    // 1. Vérifier si le client provient de la collection 'pipeline'
    const pipeRef = adminDb.collection('pipeline').doc(id)
    const pipeSnap = await pipeRef.get()
    if (pipeSnap.exists) {
      if (agentData.role === 'support_agent') {
        return NextResponse.json(
          { message: 'Un agent support ne peut pas supprimer un client issu du pipeline du manager' },
          { status: 403 }
        )
      }
      await pipeRef.delete()
      return NextResponse.json({ success: true })
    }

    // 2. Tenter suppression dans crm_clients
    const crmRef = adminDb.collection('crm_clients').doc(id)
    const crmSnap = await crmRef.get()
    if (crmSnap.exists) {
      await crmRef.delete()
      return NextResponse.json({ success: true })
    }

    // 3. Tenter suppression dans manager_prospects
    const impRef = adminDb.collection('manager_prospects').doc(id)
    const impSnap = await impRef.get()
    if (impSnap.exists) {
      await impRef.delete()
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[crm/clients/[id] DELETE]', error)
    return NextResponse.json({ message: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
