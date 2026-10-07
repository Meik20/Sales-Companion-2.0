import { NextRequest, NextResponse } from 'next/server'
import { generateOrgCode, normalizeNiu, isValidNiuFormat } from '@/lib/org'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/team/org
 * Récupère le code organisation, le rôle hiérarchique (Senior Manager vs Team Manager),
 * les informations de vérification NIU, et la liste des managers rattachés à la même organisation.
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
        return NextResponse.json({ error: 'Impossible de générer un code unique. Reessayez.' }, { status: 500 })
      }
      orgRole = 'senior_manager'

      // Batch : mettre à jour le user + créer le document Organisation
      const batch = adminDb.batch()
      batch.update(userDocRef, { orgCode, orgRole })
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
    } else if (!orgRole) {
      orgRole = 'senior_manager'
      await userDocRef.update({ orgRole }).catch(() => {})
    }

    const niu = userData.niu ? normalizeNiu(userData.niu) : null
    const isVerified = Boolean(niu)
    const isSeniorManager = orgRole === 'senior_manager'

    // Récupérer tous les managers de la même organisation
    let managers: any[] = []
    if (orgCode && hasActivePaidManagerAccess(userData)) {
      try {
        const orgManagersSnap = await adminDb
          .collection('users')
          .where('orgCode', '==', orgCode)
          .where('role', '==', 'manager')
          .get()

        managers = orgManagersSnap.docs.map((d) => {
          const mData = d.data()
          return {
            uid: d.id,
            name: mData.displayName || mData.name || mData.email,
            email: mData.email,
            phone: mData.phone || null,
            orgRole: mData.orgRole || (d.id === managerUid ? orgRole : 'team_manager'),
            isCurrent: d.id === managerUid,
            isSenior: (mData.orgRole || (d.id === managerUid ? orgRole : 'team_manager')) === 'senior_manager',
            createdAt: mData.createdAt?.toDate ? mData.createdAt.toDate().toISOString() : null
          }
        })
      } catch (mErr) {
        console.warn('Could not fetch org managers:', mErr)
      }
    }

    return NextResponse.json({
      orgCode,
      orgRole,
      isSeniorManager,
      niu,
      isVerified,
      companyName: userData.companyName || userData.company || 'Mon Organisation',
      sector: userData.sector || null,
      country: userData.country || 'CM',
      managers
    })
  } catch (error: any) {
    console.error('[GET /api/team/org] error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
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

    // 1. Mise à jour ou ajout du NIU
    if (body.niu !== undefined) {
      const rawNiu = String(body.niu).trim()
      if (rawNiu.length > 0) {
        if (!isValidNiuFormat(rawNiu)) {
          return NextResponse.json(
            {
              error: 'Format de NIU invalide. Le NIU doit comporter entre 6 et 30 caractères alphanumériques.'
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
            if (emData.companyName) updates.companyName = emData.companyName
            if (emData.sector) updates.sector = emData.sector
          }
        }
      } else {
        updates.niu = null
      }
    }

    // 2. Rattachement explicite à une organisation existante via orgCode
    if (body.joinOrgCode) {
      const targetCode = String(body.joinOrgCode).trim().toUpperCase()
      if (targetCode !== userData.orgCode) {
        // Rechercher si un manager avec cet orgCode existe
        const query = await adminDb
          .collection('users')
          .where('orgCode', '==', targetCode)
          .where('role', '==', 'manager')
          .limit(1)
          .get()

        if (query.empty) {
          return NextResponse.json(
            {
              error: `Aucune organisation trouvée avec le code "${targetCode}". Vérifiez le code partagé par votre Senior Manager.`
            },
            { status: 404 }
          )
        }

        const targetManagerData = query.docs[0]?.data()
        updates.orgCode = targetCode
        updates.orgRole = 'team_manager' // Le manager qui rejoint devient Manager d'équipe

        // Adopter la raison sociale et le secteur de l'organisation rejointe
        if (targetManagerData?.companyName) {
          updates.companyName = targetManagerData.companyName
        }
        if (targetManagerData?.sector) {
          updates.sector = targetManagerData.sector
        }

        // Si l'organisation rejointe a déjà un NIU et pas ce manager, synchroniser
        if (!updates.niu && !userData.niu && targetManagerData?.niu) {
          updates.niu = targetManagerData.niu
        }

        // Mettre à jour le compteur de membres dans organisations/
        const orgDocRef = adminDb.collection('organisations').doc(targetCode)
        const orgDoc = await orgDocRef.get()
        if (orgDoc.exists) {
          await orgDocRef.update({ updatedAt: new Date() }).catch(() => {})
        }
      }
    }

    if (Object.keys(updates).length > 1) {
      await userDocRef.update(updates)
    }

    const updatedDoc = await userDocRef.get()
    const updatedData = updatedDoc.data() || {}
    const updatedNiu = updatedData.niu ? normalizeNiu(updatedData.niu) : null

    return NextResponse.json({
      success: true,
      orgCode: updatedData.orgCode,
      orgRole: updatedData.orgRole || 'team_manager',
      isSeniorManager: updatedData.orgRole === 'senior_manager',
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
