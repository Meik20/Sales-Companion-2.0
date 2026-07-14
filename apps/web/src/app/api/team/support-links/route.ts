import { NextRequest, NextResponse } from 'next/server'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/team/support-links
 * Lie un support_agent existant (d'une autre équipe) à ce Manager (même organisation)
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const decodedToken = await adminAuth.verifyIdToken(token)
    const managerUid = decodedToken.uid

    const managerDoc = await adminDb.collection('users').doc(managerUid).get()
    const managerData = managerDoc.data()
    if (managerData?.role !== 'manager') {
      return NextResponse.json({ error: 'Seul un Manager peut lier un agent support' }, { status: 403 })
    }

    const { agentAccessId } = await request.json()
    if (!agentAccessId) {
      return NextResponse.json({ error: 'agentAccessId est requis' }, { status: 400 })
    }

    // Trouver l'agent par son accessId dans team_accesses
    const accessQuery = await adminDb
      .collection('team_accesses')
      .where('accessId', '==', agentAccessId.toLowerCase().trim())
      .limit(1)
      .get()

    if (accessQuery.empty) {
      return NextResponse.json({
        error: `Aucun accès trouvé pour l'ID "${agentAccessId}". Vérifiez l'identifiant.`
      }, { status: 404 })
    }

    const accessDoc = accessQuery.docs[0]
    if (!accessDoc) {
      return NextResponse.json({
        error: `Aucun accès trouvé pour l'ID "${agentAccessId}".`
      }, { status: 404 })
    }
    const accessData = accessDoc.data()

    // Vérifier que c'est bien un support_agent
    if (accessData.role !== 'support_agent') {
      return NextResponse.json({
        error: 'Cet identifiant n\'appartient pas à un Agent Support CRM.'
      }, { status: 400 })
    }

    // Vérifier que ce n'est pas le propre agent du manager
    if (accessData.managerUid === managerUid) {
      return NextResponse.json({
        error: 'Cet agent fait déjà partie de votre équipe.'
      }, { status: 400 })
    }

    // Retrouver l'UID Firebase de l'agent
    const agentUserQuery = await adminDb
      .collection('users')
      .where('accessId', '==', agentAccessId.toLowerCase().trim())
      .limit(1)
      .get()

    if (agentUserQuery.empty) {
      return NextResponse.json({
        error: 'Compte agent non encore activé. L\'agent doit d\'abord activer son compte.'
      }, { status: 404 })
    }

    const agentUserDoc = agentUserQuery.docs[0]
    if (!agentUserDoc) {
      return NextResponse.json({
        error: 'Compte agent introuvable.'
      }, { status: 404 })
    }
    const agentUid = agentUserDoc.id
    const agentData = agentUserDoc.data()


    // Vérifier même organisation (companyId)
    const managerCompanyId = managerData?.companyId || managerData?.company
    const agentCompanyId = agentData?.companyId || agentData?.company

    if (managerCompanyId && agentCompanyId && managerCompanyId !== agentCompanyId) {
      return NextResponse.json({
        error: 'L\'agent ne fait pas partie de la même organisation.'
      }, { status: 403 })
    }

    // Vérifier si le lien existe déjà
    const existingLink = await adminDb
      .collection('support_agent_links')
      .where('agentUid', '==', agentUid)
      .where('managerUid', '==', managerUid)
      .where('status', '==', 'active')
      .limit(1)
      .get()

    if (!existingLink.empty) {
      return NextResponse.json({
        error: 'Cet agent est déjà lié à votre équipe.'
      }, { status: 400 })
    }

    // Créer le lien
    const linkRef = await adminDb.collection('support_agent_links').add({
      agentUid,
      agentAccessId: agentAccessId.toLowerCase().trim(),
      agentName: agentData?.name || agentData?.email || 'Agent Support',
      managerUid,
      managerName: managerData?.name || managerData?.email || 'Manager',
      companyId: managerCompanyId || null,
      status: 'active',
      grantedBy: managerUid,
      grantedAt: new Date()
    })

    // Mettre à jour linkedManagerUids sur le profil de l'agent
    const { FieldValue } = await import('firebase-admin/firestore')
    await adminDb.collection('users').doc(agentUid).update({
      linkedManagerUids: FieldValue.arrayUnion(managerUid)
    })

    return NextResponse.json({
      success: true,
      linkId: linkRef.id,
      agentName: agentData?.name || agentData?.email,
      agentAccessId: agentAccessId.toLowerCase().trim()
    }, { status: 201 })
  } catch (error: any) {
    console.error('[team/support-links POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET /api/team/support-links
 * Liste les agents support liés au manager connecté
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const decodedToken = await adminAuth.verifyIdToken(token)
    const managerUid = decodedToken.uid

    const snap = await adminDb
      .collection('support_agent_links')
      .where('managerUid', '==', managerUid)
      .where('status', '==', 'active')
      .get()

    const links = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      grantedAt: doc.data().grantedAt?.toDate?.()?.toISOString() ?? null
    }))

    return NextResponse.json(links)
  } catch (error: any) {
    console.error('[team/support-links GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
