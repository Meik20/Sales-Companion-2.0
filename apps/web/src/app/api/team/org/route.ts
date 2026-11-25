import { NextRequest, NextResponse } from 'next/server'
import { generateOrgCode, normalizeNiu, isValidNiuFormat } from '@/lib/org'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'
import { PLAN_LIMITS } from '@sales-companion/shared'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/team/org
 * Récupère le code organisation, le rôle hiérarchique (Senior Manager vs Team Manager),
 * les informations de vérification NIU, et la liste des Senior Managers et Team Managers
 * rattachés à la même organisation.
 */
export async function GET(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const decodedToken = await adminAuth.verifyIdToken(token)
    const managerUid = decodedToken.uid

    const userDocRef = adminDb.collection('users').doc(managerUid)
    const userDoc = await userDocRef.get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const userData = userDoc.data()
    if (!userData) {
      return NextResponse.json({ error: 'Données utilisateur introuvables' }, { status: 404 })
    }
    if (userData.role !== 'manager') {
      return NextResponse.json({ error: 'Accès réservé aux Managers' }, { status: 403 })
    }

    let orgCode = userData.orgCode || null
    let orgRole = userData.orgRole || null

    if (!orgCode) {
      // Génération côté serveur avec vérification d'unicité Firestore
      const country = userData.country || 'CM'
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateOrgCode(country)
        const collision = await adminDb
          .collection('users')
          .where('orgCode', '==', candidate)
          .limit(1)
          .get()
        if (collision.empty) {
          orgCode = candidate
          break
        }
      }
      if (!orgCode) {
        return NextResponse.json(
          { error: 'Impossible de générer un code unique. Réessayez.' },
          { status: 500 }
        )
      }
      orgRole = 'senior_manager'
      // RÈGLE ARCHITECTURALE (AGENTS.md §7) : segment issu du profil utilisateur uniquement.
      // userData.sector est utilisé comme fallback sémantique (renseigné à l'inscription).
      // Aucune valeur hardcodée ne peut servir de segment par défaut.
      const initialSegment = userData.segment || userData.sector || null

      // Batch : mettre à jour le user + créer le document Organisation
      const batch = adminDb.batch()
      batch.update(userDocRef, {
        orgCode,
        orgRole,
        segment: initialSegment
      })
      const orgDocRef = adminDb.collection('organisations').doc(orgCode)
      batch.set(orgDocRef, {
        orgCode,
        companyName: userData.companyName || userData.company || '',
        sector: userData.sector || null,
        country,
        seniorManagerUid: managerUid,
        niu: userData.niu ? normalizeNiu(userData.niu) : null,
        isVerified: Boolean(userData.niu),
        createdAt: new Date()
      })
      await batch.commit()
    } else {
      // Vérification explicite de l'identité du propriétaire dans le document organisation
      const orgDocRef = adminDb.collection('organisations').doc(orgCode)
      const orgDocSnap = await orgDocRef.get()

      let expectedOrgRole: 'senior_manager' | 'team_manager' | 'executive' = 'team_manager'
      if (orgDocSnap.exists) {
        const orgData = orgDocSnap.data()
        expectedOrgRole =
          orgData?.seniorManagerUid === managerUid || userData.orgRole === 'senior_manager'
            ? 'senior_manager'
            : userData.orgRole === 'executive'
              ? 'executive'
              : 'team_manager'
      } else {
        // Protection P1 contre l'auto-promotion :
        // Seul un utilisateur déjà explicitement senior_manager peut rétablir le document organisation
        if (userData.orgRole === 'senior_manager') {
          expectedOrgRole = 'senior_manager'
          await orgDocRef
            .set(
              {
                orgCode,
                companyName: userData.companyName || userData.company || '',
                sector: userData.sector || null,
                country: userData.country || 'CM',
                seniorManagerUid: managerUid,
                niu: userData.niu ? normalizeNiu(userData.niu) : null,
                isVerified: Boolean(userData.niu),
                createdAt: new Date()
              },
              { merge: true }
            )
            .catch((err) => console.error('[GET /api/team/org] orgDoc create error:', err))
        } else if (userData.orgRole === 'executive') {
          expectedOrgRole = 'executive'
        } else {
          // Un Team Manager reste team_manager et ne peut pas devenir propriétaire
          expectedOrgRole = 'team_manager'
        }
      }

      if (orgRole !== expectedOrgRole) {
        orgRole = expectedOrgRole
        await userDocRef
          .update({ orgRole })
          .catch((err) => console.error('[GET /api/team/org] user update orgRole error:', err))
      }
    }

    const niu = userData.niu ? normalizeNiu(userData.niu) : null
    const isVerified = Boolean(niu)
    const isSeniorManager = orgRole === 'senior_manager'

    // Récupérer le propriétaire initial de l'organisation (SM1)
    let primarySeniorManagerUid: string | null = null
    if (orgCode) {
      const orgDoc = await adminDb.collection('organisations').doc(orgCode).get()
      if (orgDoc.exists) {
        primarySeniorManagerUid = orgDoc.data()?.seniorManagerUid || null
        // RÈGLE ARCHITECTURALE (AGENTS.md §7 Zero Hardcoding) :
        // Si le segment est un libellé de rôle fictif ('Direction', 'direction générale'),
        // on le nettoie vers null — on ne substitue JAMAIS par une valeur hardcodée.
        // Le segment est une donnée métier propre à chaque organisation cliente.
        if (
          userData.segment &&
          (userData.segment.toLowerCase() === 'direction' ||
            userData.segment.toLowerCase() === 'direction générale')
        ) {
          userData.segment = null
          await userDocRef.update({ segment: null }).catch(() => {})
        }
      }
    }
    const isPrimarySeniorManager =
      isSeniorManager && (primarySeniorManagerUid === managerUid || !primarySeniorManagerUid)

    // Récupérer tous les managers de la même organisation.
    // Requiert un index composite Firestore : (orgCode ASC, role ASC)
    let managers: any[] = []
    let executives: any[] = []
    let availableSegments: string[] = []
    let managersLoadError: string | null = null
    if (orgCode) {
      try {
        const orgManagersSnap = await adminDb
          .collection('users')
          .where('orgCode', '==', orgCode)
          .where('role', '==', 'manager')
          .get()

        const smSegmentMap = new Map<string, string>()
        orgManagersSnap.docs.forEach((d) => {
          const md = d.data()
          if (md.segment && (md.orgRole === 'senior_manager' || d.id === managerUid)) {
            smSegmentMap.set(d.id, md.segment)
          }
        })
        if (userData.segment) {
          smSegmentMap.set(managerUid, userData.segment)
        }

        // Liste globale des segments de base (noms uniquement) pour le sélecteur SM1 d'Exécutif
        const segmentSet = new Set<string>()
        orgManagersSnap.docs.forEach((d) => {
          const md = d.data()
          if (md.orgRole === 'senior_manager' && typeof md.segment === 'string' && md.segment.trim()) {
            const base = md.segment.split('(')[0]?.trim().toUpperCase()
            if (base) segmentSet.add(base)
          }
        })
        if (typeof userData.segment === 'string' && userData.segment.trim()) {
          const base = userData.segment.split('(')[0]?.trim().toUpperCase()
          if (base) segmentSet.add(base)
        }
        availableSegments = Array.from(segmentSet).sort((a, b) => a.localeCompare(b, 'fr'))

        managers = orgManagersSnap.docs
          .filter((d) => {
            const mData = d.data()
            const resolvedOrgRole = d.id === managerUid ? orgRole : mData.orgRole || 'team_manager'
            // RÈGLE ABSOLUE : Un Executive a un rôle purement stratégique et ne figure JAMAIS
            // dans la liste des managers opérationnels (Team Managers / Senior Managers).
            if (resolvedOrgRole === 'executive') return false

            // ÉTANCHÉITÉ STRICTE DES COORDINATEURS :
            // Un Coordinateur ne voit JAMAIS les autres Coordinateurs ni les Superviseurs
            // d'une autre équipe/zone, même sur le même segment.
            if (orgRole === 'senior_manager') {
              return d.id === managerUid || mData.seniorManagerUid === managerUid
            }
            return d.id === managerUid
          })
          .map((d) => {
          const mData = d.data()
          const resolvedOrgRole = d.id === managerUid ? orgRole : mData.orgRole || 'team_manager'
          const resolvedSegment =
            mData.segment ||
            (mData.seniorManagerUid ? smSegmentMap.get(mData.seniorManagerUid) : null) ||
            (resolvedOrgRole !== 'senior_manager' && userData.segment ? userData.segment : null)

          const zone = mData.zone || null
          const displaySegment = mData.displaySegment || (zone && resolvedSegment ? `${resolvedSegment} (${zone})` : resolvedSegment)

          return {
            uid: d.id,
            name: mData.displayName || mData.name || mData.email,
            email: mData.email,
            phone: mData.phone || null,
            orgRole: resolvedOrgRole,
            segment: resolvedSegment || null,
            zone: zone || null,
            displaySegment: displaySegment || null,
            seniorManagerUid: mData.seniorManagerUid || null,
            isCurrent: d.id === managerUid,
            isSenior: resolvedOrgRole === 'senior_manager',
            createdAt: mData.createdAt?.toDate ? mData.createdAt.toDate().toISOString() : null
          }
        })

        if (isPrimarySeniorManager) {
          executives = orgManagersSnap.docs
            .filter((d) => (d.data().orgRole || 'team_manager') === 'executive')
            .map((d) => {
              const eData = d.data()
              return {
                uid: d.id,
                name: eData.displayName || eData.name || eData.email,
                email: eData.email,
                customRoleLabel: eData.customRoleLabel || null,
                segment: eData.segment || null,
                segments: Array.isArray(eData.segments) ? eData.segments : []
              }
            })
        }

        console.log(
          `[GET /api/team/org] Found ${managers.length} manager(s) for orgCode=${orgCode}`
        )
      } catch (mErr: any) {
        managersLoadError = mErr?.message || 'Erreur inconnue lors du chargement des managers'
        console.error('[GET /api/team/org] Firestore managers query failed:', mErr)
      }
    }

    return NextResponse.json({
      orgCode,
      orgRole,
      isSeniorManager,
      isPrimarySeniorManager,
      primarySeniorManagerUid,
      segment: userData.segment || null,
      segments: Array.isArray(userData.segments) ? userData.segments : (userData.segment ? [userData.segment] : []),
      seniorManagerUid: userData.seniorManagerUid || primarySeniorManagerUid || null,
      niu,
      isVerified,
      companyName: userData.companyName || userData.company || 'Mon Organisation',
      sector: userData.sector || null,
      country: userData.country || 'CM',
      managers,
      executives,
      availableSegments: isPrimarySeniorManager ? availableSegments : [],
      ...(managersLoadError ? { _managersLoadError: managersLoadError } : {})
    })
  } catch (error: any) {
    console.error('[GET /api/team/org] error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}

/**
 * Helper de migration atomique des fiches de pipeline lors du changement / rattachement d'organisation
 */
async function migrateManagerPipelineOrgCode(
  adminDb: FirebaseFirestore.Firestore,
  managerUid: string,
  targetOrgCode: string
) {
  try {
    const [mgrSnap, userSnap] = await Promise.all([
      adminDb.collection('pipeline').where('managerUid', '==', managerUid).get(),
      adminDb.collection('pipeline').where('userId', '==', managerUid).get()
    ])

    const docsToUpdate = new Map<string, FirebaseFirestore.DocumentReference>()
    mgrSnap.docs.forEach((d) => {
      if (d.data().orgCode !== targetOrgCode) docsToUpdate.set(d.id, d.ref)
    })
    userSnap.docs.forEach((d) => {
      if (d.data().orgCode !== targetOrgCode) docsToUpdate.set(d.id, d.ref)
    })

    if (docsToUpdate.size === 0) return

    const entries = Array.from(docsToUpdate.values())
    const CHUNK_SIZE = 400
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE)
      const batch = adminDb.batch()
      chunk.forEach((ref) => {
        batch.update(ref, { orgCode: targetOrgCode, updatedAt: new Date() })
      })
      await batch.commit()
    }
    console.log(
      `[migrateManagerPipelineOrgCode] Successfully migrated ${docsToUpdate.size} pipeline fiches to ${targetOrgCode}`
    )
  } catch (err) {
    console.error('[migrateManagerPipelineOrgCode] Error migrating pipeline fiches:', err)
  }
}

/**
 * PATCH /api/team/org
 * Met à jour le NIU ou permet de rattacher ce manager à une organisation existante via son orgCode.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const decodedToken = await adminAuth.verifyIdToken(token)
    const managerUid = decodedToken.uid

    const userDocRef = adminDb.collection('users').doc(managerUid)
    const userDoc = await userDocRef.get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const userData = userDoc.data()
    if (!userData) {
      return NextResponse.json({ error: 'Données utilisateur introuvables' }, { status: 404 })
    }
    if (userData.role !== 'manager') {
      return NextResponse.json({ error: 'Accès réservé aux Managers' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const updates: Record<string, any> = {
      updatedAt: new Date()
    }
    let orgCodeChangedTo: string | null = null

    // 1. Mise à jour ou ajout du NIU
    if (body.niu !== undefined) {
      const rawNiu = String(body.niu).trim()
      if (rawNiu.length > 0) {
        if (!isValidNiuFormat(rawNiu)) {
          return NextResponse.json(
            {
              error:
                'Format de NIU invalide. Le NIU doit comporter entre 6 et 30 caractères alphanumériques.'
            },
            { status: 400 }
          )
        }
        const normalized = normalizeNiu(rawNiu)
        updates.niu = normalized

        // Réconciliation automatique par NIU : si un autre manager a ce NIU, s'unifier automatiquement
        const sameNiuQuery = await adminDb
          .collection('users')
          .where('niu', '==', normalized)
          .where('role', '==', 'manager')
          .limit(2)
          .get()

        const existingManagerWithNiu = sameNiuQuery.docs.find((d) => d.id !== managerUid)
        if (existingManagerWithNiu) {
          const emData = existingManagerWithNiu.data()
          if (emData.orgCode && emData.orgCode !== userData.orgCode) {
            updates.orgCode = emData.orgCode
            updates.orgRole = 'team_manager'
            orgCodeChangedTo = emData.orgCode
            if (emData.companyName) updates.companyName = emData.companyName
            if (emData.sector) updates.sector = emData.sector
            // Propager seniorManagerUid depuis le document organisation cible.
            // Invariant : tout TM doit avoir ce champ pour que le pipeline consolidé
            // du SM soit stable même après changement de segment.
            const orgDocForNiu = await adminDb.collection('organisations').doc(emData.orgCode).get()
            updates.seniorManagerUid = orgDocForNiu.data()?.seniorManagerUid || emData.seniorManagerUid || null
          }
        }
      } else {
        updates.niu = null
      }
    }

    // 2. Rattachement via Jeton d'Invitation (Multi-SM / Team Manager)
    if (body.inviteToken) {
      const inviteToken = String(body.inviteToken).trim()
      const inviteRef = adminDb.collection('orgInvites').doc(inviteToken)
      let inviteData: FirebaseFirestore.DocumentData

      try {
        inviteData = await adminDb.runTransaction(async (transaction) => {
          const doc = await transaction.get(inviteRef)
          if (!doc.exists) {
            throw new Error("Lien d'invitation introuvable ou invalide.")
          }

          const data = doc.data()!
          if (data.used === true) {
            throw new Error("Ce jeton d'invitation a déjà été utilisé.")
          }

          const expiresAt = data.expiresAt?.toDate
            ? data.expiresAt.toDate()
            : new Date(data.expiresAt)
          if (expiresAt < new Date()) {
            throw new Error("Ce jeton d'invitation a expiré (validité 7 jours).")
          }

          transaction.update(inviteRef, {
            used: true,
            usedByUid: managerUid,
            usedAt: new Date()
          })

          return data
        })
      } catch (txErr: any) {
        const msg = txErr?.message || "Erreur lors de la validation de l'invitation."
        const status =
          msg.includes('déjà été utilisé') || msg.includes('expiré') ? 410 : 404
        return NextResponse.json({ error: msg }, { status })
      }

      const targetCode = inviteData.orgCode
      updates.orgCode = targetCode
      orgCodeChangedTo = targetCode

      if (inviteData.companyName) {
        updates.companyName = inviteData.companyName
      }

      if (inviteData.type === 'senior_manager') {
        updates.orgRole = 'senior_manager'
        updates.isPrimarySeniorManager = false
        updates.invitedByUid = inviteData.createdByUid || null
        updates.segment = inviteData.segment || body.segment?.trim() || null
        if (inviteData.zone) {
          updates.zone = inviteData.zone
        }
        updates.displaySegment = inviteData.displaySegment || (updates.zone ? `${updates.segment} (${updates.zone})` : updates.segment)
        updates.seniorManagerUid = null
      } else if (inviteData.type === 'executive') {
        updates.orgRole = 'executive'
        updates.isPrimarySeniorManager = false
        updates.invitedByUid = inviteData.createdByUid || null
        // RÈGLE ARCHITECTURALE : segment et segments exclusivement issus du jeton d'invitation — jamais de fallback hardcodé
        const resolvedSegments: string[] = Array.isArray(inviteData.segments)
          ? inviteData.segments.filter(Boolean)
          : inviteData.segment
            ? [inviteData.segment]
            : []
        updates.segments = resolvedSegments
        updates.segment = resolvedSegments.length === 1 ? resolvedSegments[0] : (inviteData.segment || null)
        updates.seniorManagerUid = null
        // Propager le libellé personnalisé du rôle executive (ex: "Directeur Général", "PDG")
        if (inviteData.customRoleLabel?.trim()) {
          updates.customRoleLabel = inviteData.customRoleLabel.trim()
        }
      } else {
        updates.orgRole = 'team_manager'
        // RÈGLE ARCHITECTURALE : segment exclusivement issu du jeton d'invitation — jamais de fallback hardcodé
        updates.segment = inviteData.segment || null
        if (inviteData.zone) {
          updates.zone = inviteData.zone
        }
        if (inviteData.displaySegment) {
          updates.displaySegment = inviteData.displaySegment
        }
        updates.seniorManagerUid =
          inviteData.seniorManagerUid || inviteData.createdByUid || null
      }
    } else if (body.joinOrgCode) {
      // 2. Rattachement explicite à une organisation existante via orgCode (legacy)
      const targetCode = String(body.joinOrgCode).trim().toUpperCase()
      if (targetCode !== userData.orgCode) {
        // Rechercher si un manager ou un document organisation avec cet orgCode existe
        const [query, orgDoc] = await Promise.all([
          adminDb
            .collection('users')
            .where('orgCode', '==', targetCode)
            .where('role', '==', 'manager')
            .limit(1)
            .get(),
          adminDb.collection('organisations').doc(targetCode).get()
        ])

        if (query.empty && !orgDoc.exists) {
          return NextResponse.json(
            {
              error: `Aucune organisation trouvée avec le code "${targetCode}". Vérifiez le code partagé par votre Coordinateur.`
            },
            { status: 404 }
          )
        }

        const targetManagerData = query.docs[0]?.data()
        const orgData = orgDoc.data()
        updates.orgCode = targetCode
        updates.orgRole = 'team_manager' // Le manager qui rejoint devient Manager d'équipe
        orgCodeChangedTo = targetCode

        // Propager le seniorManagerUid depuis le document organisation.
        // Invariant critique : sans ce champ, le pipeline consolidé du SM ne peut pas
        // identifier ce TM comme subordonné si le segment a changé depuis le rattachement.
        const resolvedSeniorManagerUid = orgData?.seniorManagerUid || null
        updates.seniorManagerUid = resolvedSeniorManagerUid

        // Adopter la raison sociale et le secteur de l'organisation rejointe
        if (orgData?.companyName || targetManagerData?.companyName) {
          updates.companyName = orgData?.companyName || targetManagerData?.companyName
        }
        if (orgData?.sector || targetManagerData?.sector) {
          updates.sector = orgData?.sector || targetManagerData?.sector
        }

        // Si l'organisation rejointe a déjà un NIU et pas ce manager, synchroniser
        if (!updates.niu && !userData.niu && (orgData?.niu || targetManagerData?.niu)) {
          updates.niu = orgData?.niu || targetManagerData?.niu
        }

        // Mettre à jour l'organisation
        const orgDocRef = adminDb.collection('organisations').doc(targetCode)
        if (orgDoc.exists) {
          await orgDocRef.update({ updatedAt: new Date() }).catch(() => {})
        }
      }
    }

    // 3. Mise à jour directe du segment (si fourni sans inviteToken)
    if (body.segment !== undefined && !body.inviteToken) {
      const segVal = String(body.segment).trim()
      if (segVal) {
        updates.segment = segVal
      }
    }

    // 4. Héritage du plan de l'initiateur (SM1 / Coordinateur) pour les membres rattachés à l'organisation
    // RÈGLE MÉTIER :
    // - Tout Team Manager, tout Coordinateur invité et tout Manager Exécutif invité hérite automatiquement
    //   du plan actif et des échéances de l'initiateur de l'invitation / de l'organisation (SM1).
    const resolvedOrgRole = updates.orgRole || userData.orgRole
    const resolvedOrgCode = updates.orgCode || userData.orgCode
    const resolvedSmUid = updates.seniorManagerUid || userData.seniorManagerUid
    const isInvitedOrgRole =
      resolvedOrgRole === 'team_manager' ||
      resolvedOrgRole === 'executive' ||
      (resolvedOrgRole === 'senior_manager' &&
        (Boolean(body.inviteToken) || updates.isPrimarySeniorManager === false || Boolean(userData.invitedByUid)))

    if (isInvitedOrgRole && (resolvedSmUid || resolvedOrgCode)) {
      try {
        let sourcePlanData: Record<string, any> | null = null

        // 1. Priorité au Superviseur/Coordinateur créateur (pour TM) ou à l'initiateur de l'invitation
        const directSourceUid = resolvedSmUid || updates.invitedByUid || userData.invitedByUid
        if (directSourceUid) {
          const srcDoc = await adminDb.collection('users').doc(directSourceUid).get()
          if (srcDoc.exists && hasActivePaidManagerAccess(srcDoc.data())) {
            sourcePlanData = srcDoc.data() || null
          }
        }

        // 2. Repli / Source canonique : l'initiateur principal de l'organisation (SM1) ou organisations/{orgCode}
        if (!sourcePlanData && resolvedOrgCode) {
          const orgSnap = await adminDb.collection('organisations').doc(resolvedOrgCode).get()
          const orgDocData = orgSnap.data()
          if (orgDocData?.seniorManagerUid) {
            const sm1Doc = await adminDb.collection('users').doc(orgDocData.seniorManagerUid).get()
            if (sm1Doc.exists && hasActivePaidManagerAccess(sm1Doc.data())) {
              sourcePlanData = sm1Doc.data() || null
            }
          }
          if (!sourcePlanData && orgDocData?.plan && orgDocData.plan !== 'free' && !orgDocData.subscriptionExpired) {
            sourcePlanData = orgDocData
          }
        }

        if (sourcePlanData) {
          const inheritedPlan = sourcePlanData.plan || 'enterprise'
          updates.plan = inheritedPlan
          updates.dailyLimit =
            PLAN_LIMITS[inheritedPlan as keyof typeof PLAN_LIMITS] ?? 50
          updates.subscriptionExpiresAt =
            sourcePlanData.subscriptionExpiresAt ?? sourcePlanData.planExpiresAt ?? null
          updates.subscriptionStartedAt = sourcePlanData.subscriptionStartedAt ?? null
          updates.subscriptionExpired = false

          // Si l'email est déjà vérifié, passer directement au statut actif
          if (userData.emailVerified === true && !userData.emailVerificationPending) {
            updates.active = true
            updates.activated = true
            updates.activatedAt = new Date()
          }
        }
      } catch (planInheritErr) {
        console.warn("[PATCH /api/team/org] Erreur lors de l'héritage du plan organisation:", planInheritErr)
      }
    }

    if (Object.keys(updates).length > 1) {
      await userDocRef.update(updates)
    }

    // Migrer les fiches de pipeline du manager vers la nouvelle organisation si changement d'orgCode
    if (orgCodeChangedTo) {
      await migrateManagerPipelineOrgCode(adminDb, managerUid, orgCodeChangedTo)
    }

    const updatedDoc = await userDocRef.get()
    const updatedData = updatedDoc.data() || {}
    const updatedNiu = updatedData.niu ? normalizeNiu(updatedData.niu) : null

    // Synchroniser les Custom Claims auth token
    try {
      await adminAuth.setCustomUserClaims(managerUid, {
        role: 'manager',
        orgRole: updatedData.orgRole || 'team_manager',
        orgCode: updatedData.orgCode || null,
        segment: updatedData.segment || null
      })
    } catch (claimErr) {
      console.warn('[PATCH /api/team/org] setCustomUserClaims warn:', claimErr)
    }

    return NextResponse.json({
      success: true,
      orgCode: updatedData.orgCode,
      orgRole: updatedData.orgRole || 'team_manager',
      isSeniorManager: updatedData.orgRole === 'senior_manager',
      segment: updatedData.segment || null,
      seniorManagerUid: updatedData.seniorManagerUid || null,
      niu: updatedNiu,
      isVerified: Boolean(updatedNiu),
      companyName: updatedData.companyName || updatedData.company || 'Mon Organisation',
      sector: updatedData.sector || null
    })
  } catch (error: any) {
    console.error('[PATCH /api/team/org] error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}
