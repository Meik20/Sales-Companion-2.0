import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * DELETE /api/team/support-links/[id]
 * Révoque un lien cross-équipe
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const decodedToken = await adminAuth.verifyIdToken(token)
    const managerUid = decodedToken.uid

    const linkDoc = await adminDb.collection('support_agent_links').doc(id).get()
    if (!linkDoc.exists) {
      return NextResponse.json({ error: 'Lien introuvable' }, { status: 404 })
    }

    const linkData = linkDoc.data()!
    if (linkData.managerUid !== managerUid) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Soft delete: passer le statut à 'revoked'
    await adminDb.collection('support_agent_links').doc(id).update({
      status: 'revoked',
      revokedAt: new Date(),
      revokedBy: managerUid
    })


    // Retirer le managerUid de linkedManagerUids sur le profil de l'agent
    const { FieldValue } = await import('firebase-admin/firestore')
    await adminDb.collection('users').doc(linkData.agentUid).update({
      linkedManagerUids: FieldValue.arrayRemove(managerUid)
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[team/support-links DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
