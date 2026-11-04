export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/team/targets/renew
 *
 * Reconduit les objectifs du mois M-1 vers un nouveau mois cible.
 * Utilisé en début de mois pour précharger les objectifs du mois courant
 * ou anticiper les objectifs du mois M+1.
 *
 * Body JSON :
 * {
 *   fromPeriod: string   // YYYY-MM  (période source, ex. "2026-10")
 *   toPeriod:   string   // YYYY-MM  (période cible, ex. "2026-11")
 *   overwrite?: boolean  // si true, écrase les objectifs déjà définis pour toPeriod (défaut: false)
 * }
 *
 * Règles :
 * - Seul un Team Manager actif peut reconduire ses propres objectifs d'équipe.
 * - On ne reconduit que les objectifs des membres encore actifs (team_accesses actif, non promu).
 * - Si overwrite=false et qu'un objectif existe déjà pour toPeriod, on le saute silencieusement.
 * - Réponse : { renewed: number, skipped: number, period: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let managerUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      managerUid = decoded.uid
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // Contrôle de rôle : seul un manager actif peut reconduire
    const callerDoc = await adminDb.collection('users').doc(managerUid).get()
    const callerData = callerDoc.data()
    if (!hasActivePaidManagerAccess(callerData)) {
      return NextResponse.json(
        { message: 'Un abonnement Manager actif et vérifié est requis.' },
        { status: 403 }
      )
    }

    // Interdit au Senior Manager : il n'a pas de portefeuille opérationnel
    if (callerData?.orgRole === 'senior_manager') {
      return NextResponse.json(
        { message: 'Le Senior Manager ne gère pas de portefeuille opérationnel. Utilisez la vue de votre Team Manager.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { fromPeriod, toPeriod, overwrite = false } = body

    // Validation des périodes
    const periodRegex = /^\d{4}-\d{2}$/
    if (!fromPeriod || !toPeriod || !periodRegex.test(fromPeriod) || !periodRegex.test(toPeriod)) {
      return NextResponse.json(
        { message: 'fromPeriod et toPeriod sont requis au format YYYY-MM' },
        { status: 400 }
      )
    }
    if (fromPeriod === toPeriod) {
      return NextResponse.json(
        { message: 'fromPeriod et toPeriod doivent être différents' },
        { status: 400 }
      )
    }

    const orgCode = callerData?.orgCode || null

    // 1. Récupérer les objectifs de la période source pour ce manager
    const sourceSnap = await adminDb
      .collection('teamTargets')
      .where('managerUid', '==', managerUid)
      .where('period', '==', fromPeriod)
      .get()

    if (sourceSnap.empty) {
      return NextResponse.json({ renewed: 0, skipped: 0, period: toPeriod, message: 'Aucun objectif trouvé pour la période source' })
    }

    // 2. Récupérer les membres encore actifs pour validation
    const activeAccessSnap = await adminDb
      .collection('team_accesses')
      .where('managerUid', '==', managerUid)
      .get()

    const activeMemberIds = new Set<string>()
    activeAccessSnap.docs.forEach((d) => {
      const data = d.data()
      if (data.role === 'support_agent' || data.status === 'promoted') return
      activeMemberIds.add(d.id)
      if (data.firebaseUid) activeMemberIds.add(data.firebaseUid)
      if (data.activatedUid) activeMemberIds.add(data.activatedUid)
      if (data.memberId) activeMemberIds.add(data.memberId)
    })

    // 3. Si on ne veut pas écraser, récupérer les objectifs déjà définis pour toPeriod
    let existingTargetMemberIds = new Set<string>()
    if (!overwrite) {
      const existingSnap = await adminDb
        .collection('teamTargets')
        .where('managerUid', '==', managerUid)
        .where('period', '==', toPeriod)
        .get()
      existingTargetMemberIds = new Set(existingSnap.docs.map((d) => d.data().memberId).filter(Boolean))
    }

    // 4. Reconduire les objectifs via un batch Firestore
    const batch = adminDb.batch()
    let renewed = 0
    let skipped = 0
    const now = new Date()

    for (const sourceDoc of sourceSnap.docs) {
      const src = sourceDoc.data()
      const memberId = src.memberId

      if (!memberId) { skipped++; continue }

      // Exclure les membres qui ne sont plus actifs (désactivés, révoqués, promus)
      if (activeMemberIds.size > 0 && !activeMemberIds.has(memberId)) {
        skipped++
        continue
      }

      // Sauter si objectif déjà présent et overwrite=false
      if (!overwrite && existingTargetMemberIds.has(memberId)) {
        skipped++
        continue
      }

      const docId = `${managerUid}_${memberId}_${toPeriod}`
      const docRef = adminDb.collection('teamTargets').doc(docId)

      batch.set(
        docRef,
        {
          managerUid,
          orgCode,
          memberId,
          memberName: src.memberName ?? null,
          targetVolume: src.targetVolume ?? null,
          targetValue: src.targetValue ?? null,
          period: toPeriod,
          renewedFromPeriod: fromPeriod,
          updatedAt: now
        },
        { merge: true }
      )
      renewed++
    }

    if (renewed > 0) {
      await batch.commit()
    }

    return NextResponse.json({ renewed, skipped, period: toPeriod }, { status: 200 })
  } catch (error) {
    console.error('[team/targets/renew POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

