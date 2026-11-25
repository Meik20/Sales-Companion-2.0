import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/team/org/coordinator/interim
 * Permet au SM1 d'affecter ou de retirer un segment intérimaire à un Coordinateur.
 * 
 * Body :
 * - coordinatorUid: string
 * - action: 'assign' | 'remove'
 * - segment: string (ex: 'PME')
 * - zone?: string (ex: 'Ouest')
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    // 1. Authentification
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    }

    let callerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      callerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Session expirée ou token invalide' }, { status: 401 })
    }

    // 2. Vérification des droits SM1
    const callerDoc = await adminDb.collection('users').doc(callerUid).get()
    const callerData = callerDoc.data()

    if (!hasActivePaidManagerAccess(callerData) || callerData?.orgRole !== 'senior_manager') {
      return NextResponse.json(
        { message: 'Action strictement réservée au Senior Manager avec abonnement actif' },
        { status: 403 }
      )
    }

    const orgCode = callerData.orgCode as string | undefined
    if (!orgCode) {
      return NextResponse.json(
        { message: 'Aucun code organisation associé à votre compte' },
        { status: 400 }
      )
    }

    const orgDoc = await adminDb.collection('organisations').doc(orgCode).get()
    const primarySmUid = orgDoc.exists ? orgDoc.data()?.seniorManagerUid : null

    const isPrimarySeniorManager =
      callerData.isPrimarySeniorManager !== false &&
      !Boolean(callerData.invitedByUid) &&
      (!primarySmUid || primarySmUid === callerUid)

    if (!isPrimarySeniorManager) {
      return NextResponse.json(
        { message: 'Seul le Coordinateur principal (initiateur de l’organisation) peut gérer les intérims.' },
        { status: 403 }
      )
    }

    // 3. Validation du body
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps de requête JSON invalide' }, { status: 400 })
    }

    const { coordinatorUid, action, segment, zone } = body as {
      coordinatorUid?: string
      action?: 'assign' | 'remove'
      segment?: string
      zone?: string
    }

    if (!coordinatorUid || typeof coordinatorUid !== 'string') {
      return NextResponse.json({ message: 'L’identifiant du coordinateur est requis' }, { status: 400 })
    }

    if (!action || (action !== 'assign' && action !== 'remove')) {
      return NextResponse.json({ message: 'L’action doit être "assign" ou "remove"' }, { status: 400 })
    }

    if (!segment || !segment.trim()) {
      return NextResponse.json({ message: 'Le segment d’intérim est requis' }, { status: 400 })
    }

    const targetUserDoc = await adminDb.collection('users').doc(coordinatorUid).get()
    if (!targetUserDoc.exists) {
      return NextResponse.json({ message: 'Coordinateur introuvable' }, { status: 404 })
    }

    const targetData = targetUserDoc.data() || {}
    if (targetData.orgCode !== orgCode || targetData.orgRole !== 'senior_manager') {
      return NextResponse.json(
        { message: 'L’utilisateur ciblé n’est pas un Coordinateur de votre organisation' },
        { status: 400 }
      )
    }

    const cleanSegment = segment.trim().toUpperCase()
    const cleanZone = typeof zone === 'string' ? zone.trim() : ''
    const cleanDisplay = cleanZone ? `${cleanSegment} (${cleanZone})` : cleanSegment

    const existingInterims = Array.isArray(targetData.interimSegments) ? targetData.interimSegments : []

    let updatedInterims: any[]
    if (action === 'assign') {
      // Éviter les doublons
      const filtered = existingInterims.filter((i: any) => {
        const itemSeg = typeof i === 'string' ? i : i.displaySegment || i.segment
        return itemSeg?.trim().toLowerCase() !== cleanDisplay.toLowerCase()
      })
      updatedInterims = [
        ...filtered,
        {
          segment: cleanSegment,
          zone: cleanZone || null,
          displaySegment: cleanDisplay,
          assignedAt: new Date().toISOString(),
          assignedByUid: callerUid
        }
      ]
    } else {
      updatedInterims = existingInterims.filter((i: any) => {
        const itemSeg = typeof i === 'string' ? i : i.displaySegment || i.segment
        return itemSeg?.trim().toLowerCase() !== cleanDisplay.toLowerCase()
      })
    }

    await adminDb.collection('users').doc(coordinatorUid).update({
      interimSegments: updatedInterims,
      updatedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      message:
        action === 'assign'
          ? `Intérim assigné au Coordinateur pour le segment « ${cleanDisplay} »`
          : `Intérim retiré pour le segment « ${cleanDisplay} »`,
      coordinatorUid,
      interimSegments: updatedInterims
    })
  } catch (error: any) {
    console.error('[POST /api/team/org/coordinator/interim] error:', error)
    return NextResponse.json({ message: error.message || 'Erreur interne' }, { status: 500 })
  }
}
