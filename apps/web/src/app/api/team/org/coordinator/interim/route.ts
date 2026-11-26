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

    const { coordinatorUid, action, segment, zone, targetCoordinatorUid } = body as {
      coordinatorUid?: string
      action?: 'assign' | 'remove'
      segment?: string
      zone?: string | null
      targetCoordinatorUid?: string | null
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

    const cleanSegment = segment.trim().toUpperCase()
    const cleanZone = typeof zone === 'string' ? zone.trim() : ''
    const cleanDisplay = cleanZone ? `${cleanSegment} (${cleanZone})` : cleanSegment

    const matchesInterimEntry = (i: any): boolean => {
      if (typeof i === 'string') {
        return i.trim().toLowerCase() === cleanDisplay.toLowerCase()
      }
      const itemDisplay = (i?.displaySegment || (i?.zone ? `${i.segment} (${i.zone})` : i?.segment) || '')
        .trim()
        .toLowerCase()
      if (itemDisplay === cleanDisplay.toLowerCase()) return true
      // Fallback si la zone n'a pas été passée explicitement mais un seul segment correspond
      if (!cleanZone && (i?.segment || '').trim().toLowerCase() === cleanSegment.toLowerCase()) {
        return true
      }
      return false
    }

    const cleanTargetUid =
      action === 'remove' && typeof targetCoordinatorUid === 'string' && targetCoordinatorUid.trim()
        ? targetCoordinatorUid.trim()
        : null

    if (cleanTargetUid && cleanTargetUid === coordinatorUid) {
      return NextResponse.json(
        { message: 'Le Coordinateur destinataire doit être différent du Coordinateur actuel.' },
        { status: 400 }
      )
    }

    const sourceRef = adminDb.collection('users').doc(coordinatorUid)
    const targetRef = cleanTargetUid ? adminDb.collection('users').doc(cleanTargetUid) : null

    const txResult = await adminDb.runTransaction(async (tx) => {
      const sourceDoc = await tx.get(sourceRef)
      if (!sourceDoc.exists) {
        throw new Error('NOT_FOUND:Coordinateur introuvable')
      }
      const sourceData = sourceDoc.data() || {}
      if (sourceData.orgCode !== orgCode || sourceData.orgRole !== 'senior_manager') {
        throw new Error('BAD_REQUEST:L’utilisateur ciblé n’est pas un Coordinateur de votre organisation')
      }

      const existingInterims = Array.isArray(sourceData.interimSegments) ? sourceData.interimSegments : []
      const nowIso = new Date().toISOString()

      if (action === 'assign') {
        const filtered = existingInterims.filter((i: any) => !matchesInterimEntry(i))
        const updatedInterims = [
          ...filtered,
          {
            segment: cleanSegment,
            zone: cleanZone || null,
            displaySegment: cleanDisplay,
            assignedAt: nowIso,
            assignedByUid: callerUid
          }
        ]
        tx.update(sourceRef, { interimSegments: updatedInterims, updatedAt: new Date() })
        return {
          updatedSourceInterims: updatedInterims,
          updatedTargetInterims: null as any[] | null,
          targetName: null as string | null
        }
      }

      // action === 'remove'
      const removedItem = existingInterims.find((i: any) => matchesInterimEntry(i))
      const updatedSourceInterims = existingInterims.filter((i: any) => !matchesInterimEntry(i))

      let updatedTargetInterims: any[] | null = null
      let targetName: string | null = null

      if (targetRef) {
        const destDoc = await tx.get(targetRef)
        if (!destDoc.exists) {
          throw new Error('NOT_FOUND:Coordinateur destinataire introuvable')
        }
        const destData = destDoc.data() || {}
        if (destData.orgCode !== orgCode || destData.orgRole !== 'senior_manager') {
          throw new Error('BAD_REQUEST:Le destinataire sélectionné n’est pas un Coordinateur de votre organisation')
        }
        targetName = destData.name || destData.displayName || destData.email || 'Coordinateur'
        const destInterims = Array.isArray(destData.interimSegments) ? destData.interimSegments : []
        const dedupedDest = destInterims.filter((i: any) => !matchesInterimEntry(i))
        const reassignedPayload =
          removedItem && typeof removedItem === 'object'
            ? {
                ...removedItem,
                assignedAt: nowIso,
                assignedByUid: callerUid
              }
            : {
                segment: cleanSegment,
                zone: cleanZone || null,
                displaySegment: cleanDisplay,
                assignedAt: nowIso,
                assignedByUid: callerUid
              }
        updatedTargetInterims = [...dedupedDest, reassignedPayload]
        tx.update(targetRef, { interimSegments: updatedTargetInterims, updatedAt: new Date() })
      }

      tx.update(sourceRef, { interimSegments: updatedSourceInterims, updatedAt: new Date() })
      return { updatedSourceInterims, updatedTargetInterims, targetName }
    })

    return NextResponse.json({
      success: true,
      message:
        action === 'assign'
          ? `Intérim assigné au Coordinateur pour le segment « ${cleanDisplay} »`
          : cleanTargetUid
            ? `Intérim « ${cleanDisplay} » transféré à ${txResult.targetName} sans perte de données.`
            : `Intérim retiré pour le segment « ${cleanDisplay} »`,
      coordinatorUid,
      interimSegments: txResult.updatedSourceInterims,
      targetCoordinatorUid: cleanTargetUid,
      targetInterimSegments: txResult.updatedTargetInterims
    })
  } catch (error: any) {
    const msg = error?.message || ''
    if (msg.startsWith('NOT_FOUND:')) {
      return NextResponse.json({ message: msg.replace('NOT_FOUND:', '') }, { status: 404 })
    }
    if (msg.startsWith('BAD_REQUEST:')) {
      return NextResponse.json({ message: msg.replace('BAD_REQUEST:', '') }, { status: 400 })
    }
    console.error('[POST /api/team/org/coordinator/interim] error:', error)
    return NextResponse.json({ message: error.message || 'Erreur interne' }, { status: 500 })
  }
}
