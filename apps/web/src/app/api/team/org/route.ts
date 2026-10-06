import { NextRequest, NextResponse } from 'next/server'
import { generateOrgCode, normalizeNiu, isValidNiuFormat } from '@/lib/org'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/team/org
 * Récupère le code organisation et les informations de vérification NIU du Manager connecté.
 * Génère automatiquement un orgCode si le compte n'en possède pas encore.
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

    const userData = userDoc.data()!
    if (userData.role !== 'manager') {
      return NextResponse.json({ error: 'Accès réservé aux Managers' }, { status: 403 })
    }

    let orgCode = userData.orgCode || null
    if (!orgCode) {
      orgCode = generateOrgCode(userData.country || 'CM')
      await userDocRef.update({ orgCode }).catch(() => {})
    }

    const niu = userData.niu ? normalizeNiu(userData.niu) : null
    const isVerified = Boolean(niu)

    return NextResponse.json({
      orgCode,
      niu,
      isVerified,
      companyName: userData.companyName || userData.company || 'Mon Organisation'
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

    const userData = userDoc.data()!
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
          return NextResponse.json({
            error: 'Format de NIU invalide. Le NIU doit comporter entre 6 et 30 caractères alphanumériques.'
          }, { status: 400 })
        }
        updates.niu = normalizeNiu(rawNiu)
      } else {
        updates.niu = null
      }
    }

    // 2. Rattachement à une organisation existante via orgCode
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
          return NextResponse.json({
            error: `Aucune organisation trouvée avec le code "${targetCode}". Vérifiez le code partagé par votre collègue manager.`
          }, { status: 404 })
        }

        const targetManagerData = query.docs[0]?.data()
        updates.orgCode = targetCode
        // Si le compte rejoint a déjà un NIU et pas ce manager, synchroniser si désiré
        if (!updates.niu && !userData.niu && targetManagerData?.niu) {
          updates.niu = targetManagerData.niu
        }
      }
    }

    if (Object.keys(updates).length > 1) {
      await userDocRef.update(updates)
    }

    const updatedDoc = await userDocRef.get()
    const updatedData = updatedDoc.data()!
    const updatedNiu = updatedData.niu ? normalizeNiu(updatedData.niu) : null

    return NextResponse.json({
      success: true,
      orgCode: updatedData.orgCode,
      niu: updatedNiu,
      isVerified: Boolean(updatedNiu),
      companyName: updatedData.companyName || updatedData.company || 'Mon Organisation'
    })
  } catch (error: any) {
    console.error('[PATCH /api/team/org] error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}
