import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

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
    if (!hasActivePaidManagerAccess(managerData) || decodedToken.email_verified !== true) {
      return NextResponse.json(
        { error: 'Un abonnement Manager actif et vérifié est requis.' },
        { status: 403 }
      )
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
      return NextResponse.json(
        {
          error: `Aucun accès trouvé pour l'ID "${agentAccessId}". Vérifiez l'identifiant.`
        },
        { status: 404 }
      )
    }

    const accessDoc = accessQuery.docs[0]
    if (!accessDoc) {
      return NextResponse.json(
        {
          error: `Aucun accès trouvé pour l'ID "${agentAccessId}".`
        },
        { status: 404 }
      )
    }
    const accessData = accessDoc.data()

    // Vérifier que c'est bien un support_agent
    if (accessData.role !== 'support_agent') {
      return NextResponse.json(
        {
          error: "Cet identifiant n'appartient pas à un Agent Support CRM."
        },
        { status: 400 }
      )
    }

    // Vérifier que ce n'est pas le propre agent du manager
    if (accessData.managerUid === managerUid) {
      return NextResponse.json(
        {
          error: 'Cet agent fait déjà partie de votre équipe.'
        },
        { status: 400 }
      )
    }

    // Retrouver l'UID Firebase de l'agent
    // Priorité 1 : firebaseUid stocké directement dans team_accesses
    let agentUid: string = accessData.firebaseUid || ''
    let agentUserDoc: FirebaseFirestore.DocumentSnapshot | null = null

    if (agentUid) {
      const directDoc = await adminDb.collection('users').doc(agentUid).get()
      if (directDoc.exists) {
        agentUserDoc = directDoc
      }
    }

    // Priorité 2 : chercher par email dans users (cas anciens comptes)
    if (!agentUserDoc) {
      const agentEmail: string = accessData.email || accessData.accessId || ''
      if (agentEmail) {
        const emailQuery = await adminDb
          .collection('users')
          .where('email', '==', agentEmail)
          .limit(1)
          .get()
        if (!emailQuery.empty && emailQuery.docs[0]) {
          agentUserDoc = emailQuery.docs[0]
          agentUid = agentUserDoc.id
        }
      }
    }

    // Priorité 3 : Firebase Auth (dernier recours)
    if (!agentUserDoc && !agentUid) {
      try {
        const agentEmail = accessData.email || accessData.accessId || ''
        if (agentEmail && agentEmail.includes('@')) {
          const authUser = await adminAuth.getUserByEmail(agentEmail)
          agentUid = authUser.uid
          const directDoc = await adminDb.collection('users').doc(agentUid).get()
          if (directDoc.exists) agentUserDoc = directDoc
        }
      } catch {
        // Utilisateur introuvable même dans Firebase Auth
      }
    }

    if (!agentUserDoc || !agentUid) {
      return NextResponse.json(
        {
          error: "Compte agent non encore activé. L'agent doit d'abord activer son compte."
        },
        { status: 404 }
      )
    }

    const agentData = agentUserDoc.data()
    if (!agentData) {
      return NextResponse.json(
        {
          error: "Profil de l'agent introuvable ou incomplet."
        },
        { status: 404 }
      )
    }

    // ── Vérification hybride de l'organisation (orgCode > NIU > Legacy Fallback) ──
    const { generateOrgCode, normalizeNiu } = await import('@/lib/org')

    // 1. Récupérer le Manager d'origine qui a créé l'agent
    const originalManagerUid = accessData.managerUid
    let originalManagerData: FirebaseFirestore.DocumentData | null = null
    if (originalManagerUid) {
      const origDoc = await adminDb.collection('users').doc(originalManagerUid).get()
      if (origDoc.exists) {
        originalManagerData = origDoc.data() || null
      }
    }

    // 2. Migration à la volée (Lazy generation) de orgCode si manquant
    let managerOrgCode = managerData?.orgCode || null
    if (!managerOrgCode) {
      managerOrgCode = generateOrgCode(managerData?.country || 'CM')
      await adminDb
        .collection('users')
        .doc(managerUid)
        .update({ orgCode: managerOrgCode })
        .catch(() => {})
    }

    let originalOrgCode =
      originalManagerData?.orgCode || accessData?.orgCode || agentData?.orgCode || null
    if (!originalOrgCode && originalManagerUid) {
      originalOrgCode = generateOrgCode(originalManagerData?.country || 'CM')
      await adminDb
        .collection('users')
        .doc(originalManagerUid)
        .update({ orgCode: originalOrgCode })
        .catch(() => {})
      if (agentUid) {
        await adminDb
          .collection('users')
          .doc(agentUid)
          .update({ orgCode: originalOrgCode })
          .catch(() => {})
      }
    }

    // 3. Normalisation et vérification NIU
    const managerNiu = normalizeNiu(managerData?.niu)
    const originalNiu = normalizeNiu(originalManagerData?.niu || accessData?.niu || agentData?.niu)

    // 4. Noms d'entreprise legacy (pour la période de transition / comptes historiques)
    const managerCompanyId =
      managerData?.companyId || managerData?.company || managerData?.companyName || ''
    const managerCompanyNorm = managerCompanyId.trim().toLowerCase()
    const originalCompanyNorm = (
      originalManagerData?.companyId ||
      originalManagerData?.company ||
      originalManagerData?.companyName ||
      accessData?.company ||
      agentData?.company ||
      agentData?.companyId ||
      ''
    )
      .trim()
      .toLowerCase()

    // 5. Critères de correspondance
    const isOrgCodeMatch = Boolean(
      managerOrgCode && originalOrgCode && managerOrgCode === originalOrgCode
    )
    const isNiuMatch = Boolean(managerNiu && originalNiu && managerNiu === originalNiu)
    const isLegacyCompanyMatch = Boolean(
      managerCompanyNorm && originalCompanyNorm && managerCompanyNorm === originalCompanyNorm
    )

    const isSameOrg = isOrgCodeMatch || isNiuMatch || isLegacyCompanyMatch

    if (!isSameOrg) {
      return NextResponse.json(
        {
          error:
            "L'agent ne fait pas partie de la même organisation. Pour lier un agent support cross-équipe, vos deux comptes Manager doivent partager le même Code Organisation ou le même NIU."
        },
        { status: 403 }
      )
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
      return NextResponse.json(
        {
          error: 'Cet agent est déjà lié à votre équipe.'
        },
        { status: 400 }
      )
    }

    // Créer le lien
    const linkRef = await adminDb.collection('support_agent_links').add({
      agentUid,
      agentAccessId: agentAccessId.toLowerCase().trim(),
      agentName: agentData?.name || agentData?.email || 'Agent Support',
      managerUid,
      managerName: managerData?.name || managerData?.email || 'Manager',
      companyId: managerCompanyId || null,
      orgCode: managerOrgCode || originalOrgCode || null,
      niu: managerNiu || originalNiu || null,
      status: 'active',
      grantedBy: managerUid,
      grantedAt: new Date()
    })

    // Mettre à jour linkedManagerUids sur le profil de l'agent
    const { FieldValue } = await import('firebase-admin/firestore')
    await adminDb
      .collection('users')
      .doc(agentUid)
      .update({
        linkedManagerUids: FieldValue.arrayUnion(managerUid)
      })

    return NextResponse.json(
      {
        success: true,
        linkId: linkRef.id,
        agentName: agentData?.name || agentData?.email,
        agentAccessId: agentAccessId.toLowerCase().trim()
      },
      { status: 201 }
    )
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

    const links = snap.docs.map((doc) => ({
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
