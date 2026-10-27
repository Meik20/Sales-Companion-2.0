import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile/segment
 * Récupère le segment d'appartenance de l'utilisateur connecté avec auto-résolution
 * et auto-guérison (backfill) dans Firestore si le champ était manquant.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.split(' ')[1] ?? null
    if (!authHeader) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = await adminAuth.verifyIdToken(authHeader)
    } catch {
      return NextResponse.json({ error: 'Session expirée ou invalide' }, { status: 401 })
    }

    const userDocRef = adminDb.collection('users').doc(decoded.uid)
    const userDoc = await userDocRef.get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const userData = userDoc.data() || {}

    // 1. Si le segment est déjà directement renseigné sur l'utilisateur
    if (userData.segment && typeof userData.segment === 'string' && userData.segment.trim()) {
      return NextResponse.json({ segment: userData.segment.trim() })
    }

    let resolvedSegment: string | null = null

    // 2. Si le membre a un manager assigné (Team Manager opérationnel ou Senior Manager)
    const mUid = userData.managerUid || userData.managerId
    if (mUid) {
      try {
        const managerDoc = await adminDb.collection('users').doc(mUid).get()
        if (managerDoc.exists) {
          const mData = managerDoc.data()
          if (mData?.segment && typeof mData.segment === 'string' && mData.segment.trim()) {
            resolvedSegment = mData.segment.trim()
          }
        }
      } catch (err) {
        console.warn('[GET /api/profile/segment] Failed to check manager segment:', err)
      }
    }

    // 3. Si non résolu, vérifier auprès du Senior Manager de l'organisation
    if (!resolvedSegment && userData.seniorManagerUid) {
      try {
        const smDoc = await adminDb.collection('users').doc(userData.seniorManagerUid).get()
        if (smDoc.exists) {
          const smData = smDoc.data()
          if (smData?.segment && typeof smData.segment === 'string' && smData.segment.trim()) {
            resolvedSegment = smData.segment.trim()
          }
        }
      } catch (err) {
        console.warn('[GET /api/profile/segment] Failed to check senior manager segment:', err)
      }
    }

    // 4. Si non résolu, chercher dans les accès d'équipe (team_accesses)
    if (!resolvedSegment) {
      try {
        const accessSnap = await adminDb
          .collection('team_accesses')
          .where('firebaseUid', '==', decoded.uid)
          .limit(1)
          .get()

        if (!accessSnap.empty && accessSnap.docs[0]) {
          const aData = accessSnap.docs[0].data()
          if (aData?.segment && typeof aData.segment === 'string' && aData.segment.trim()) {
            resolvedSegment = aData.segment.trim()
          }
        }
      } catch (err) {
        console.warn('[GET /api/profile/segment] Failed to check team_accesses by firebaseUid:', err)
      }
    }

    // 5. Si toujours non résolu et que l'utilisateur a un orgCode (organisation)
    if (!resolvedSegment && userData.orgCode) {
      try {
        const smQuery = await adminDb
          .collection('users')
          .where('orgCode', '==', userData.orgCode)
          .where('orgRole', '==', 'senior_manager')
          .limit(1)
          .get()

        if (!smQuery.empty && smQuery.docs[0]) {
          const smData = smQuery.docs[0].data()
          if (smData?.segment && typeof smData.segment === 'string' && smData.segment.trim()) {
            resolvedSegment = smData.segment.trim()
          }
        }
      } catch (err) {
        console.warn('[GET /api/profile/segment] Failed to check org senior manager segment:', err)
      }
    }

    // Auto-guérison : si un segment a été déduit, on l'écrit atomiquement sur le profil pour persistance
    if (resolvedSegment) {
      try {
        await userDocRef.update({
          segment: resolvedSegment,
          updatedAt: new Date()
        })
      } catch (updateErr) {
        console.warn('[GET /api/profile/segment] Auto-healing segment backfill failed:', updateErr)
      }
    }

    return NextResponse.json({ segment: resolvedSegment || null })
  } catch (error: any) {
    console.error('[GET /api/profile/segment] Internal error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur interne lors de la récupération du segment' },
      { status: 500 }
    )
  }
}
