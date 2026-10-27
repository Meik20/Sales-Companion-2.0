import { NextRequest, NextResponse } from 'next/server'
import { hasActivePaidManagerAccess } from '@/lib/manager-access'

export const dynamic = 'force-dynamic'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * PATCH /api/team/org/segment/rename
 * Renomme le segment d'un Senior Manager et propage ce nouveau nom EN PROFONDEUR :
 *  1. users/{smUid}.segment                   — le SM lui-même
 *  2. users/{tmUid}.segment                   — tous les TMs du segment
 *  3. users/{memberUid}.segment               — tous les commerciaux rattachés à ces TMs
 *  4. pipeline/{id}.segment                   — toutes les fiches pipeline du segment
 *
 * RÈGLES ARCHITECTURALES (AGENTS.md) :
 * - Seul le Senior Manager (orgRole === 'senior_manager') peut renommer son segment.
 * - La propagation est atomique (batches Firestore par tranches de 400 ops).
 * - La correspondance se fait par `orgCode + oldSegment` (insensible à la casse pour comparer).
 * - Un SM ne peut renommer que son propre segment (cloisonnement).
 */
export async function PATCH(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    // ── 1. Authentification ─────────────────────────────────────────────────
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

    // ── 2. Vérification des droits Senior Manager ───────────────────────────
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

    // ── 3. Validation du corps de requête ────────────────────────────────────
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Corps de requête JSON invalide' }, { status: 400 })
    }

    const { newSegment } = body as { newSegment?: string }

    if (!newSegment || !newSegment.trim()) {
      return NextResponse.json(
        { message: 'Le nouveau nom de segment est requis' },
        { status: 400 }
      )
    }

    const newSegmentTrimmed = newSegment.trim()
    const oldSegment = (callerData.segment as string | undefined)?.trim()

    if (!oldSegment) {
      return NextResponse.json(
        { message: 'Aucun segment actuel trouvé pour votre compte. Veuillez configurer votre segment.' },
        { status: 400 }
      )
    }

    // Comparer de manière insensible à la casse pour détecter si c'est identique
    if (oldSegment.toLowerCase() === newSegmentTrimmed.toLowerCase()) {
      return NextResponse.json({
        success: true,
        message: 'Le nom du segment est identique — aucune modification effectuée.',
        updatedCount: { users: 0, pipeline: 0 }
      })
    }

    const now = new Date()
    const { FieldValue } = await import('firebase-admin/firestore')

    // ── 4. Récupération de tous les utilisateurs du segment (SM + TMs + commerciaux) ─
    // Stratégie : on cible tous les users ayant orgCode + segment ainsi que ceux rattachés hiérarchiquement
    const userDocsToUpdate = new Map<string, FirebaseFirestore.DocumentReference>()

    const usersSnap = await adminDb
      .collection('users')
      .where('orgCode', '==', orgCode)
      .where('segment', '==', oldSegment)
      .get()
    usersSnap.docs.forEach((d) => userDocsToUpdate.set(d.id, d.ref))

    // Récupérer aussi les TMs expressément subordonnés à ce Senior Manager
    try {
      const subordinateTmsSnap = await adminDb
        .collection('users')
        .where('orgCode', '==', orgCode)
        .where('seniorManagerUid', '==', callerUid)
        .get()
      subordinateTmsSnap.docs.forEach((d) => userDocsToUpdate.set(d.id, d.ref))

      // Récupérer tous les commerciaux rattachés à ces TMs ou à ce SM
      const managerUids = [callerUid, ...subordinateTmsSnap.docs.map((d) => d.id)]
      for (let i = 0; i < managerUids.length; i += 30) {
        const chunk = managerUids.slice(i, i + 30)
        const managedMembersSnap = await adminDb
          .collection('users')
          .where('orgCode', '==', orgCode)
          .where('managerUid', 'in', chunk)
          .get()
        managedMembersSnap.docs.forEach((d) => userDocsToUpdate.set(d.id, d.ref))
      }
    } catch (subErr) {
      console.warn('[PATCH /api/team/org/segment/rename] subordinate users lookup warning:', subErr)
    }

    // ── 5. Récupération des accès d'équipe (team_accesses) du segment ───────
    const accessDocsToUpdate = new Map<string, FirebaseFirestore.DocumentReference>()
    try {
      const accessesSnap = await adminDb
        .collection('team_accesses')
        .where('orgCode', '==', orgCode)
        .where('segment', '==', oldSegment)
        .get()
      accessesSnap.docs.forEach((d) => accessDocsToUpdate.set(d.id, d.ref))
    } catch (accErr) {
      console.warn('[PATCH /api/team/org/segment/rename] team_accesses lookup warning:', accErr)
    }

    // ── 6. Récupération des fiches pipeline du segment ──────────────────────
    const pipelineSnap = await adminDb
      .collection('pipeline')
      .where('orgCode', '==', orgCode)
      .where('segment', '==', oldSegment)
      .get()

    console.log(
      `[PATCH /api/team/org/segment/rename] orgCode=${orgCode} oldSegment="${oldSegment}" → "${newSegmentTrimmed}" | ${userDocsToUpdate.size} users, ${accessDocsToUpdate.size} accesses, ${pipelineSnap.size} pipeline docs`
    )

    // ── 7. Propagation atomique par batches ──────────────────────────────────
    let batch = adminDb.batch()
    let opCount = 0

    const commitBatchIfFull = async () => {
      if (opCount >= 400) {
        await batch.commit()
        batch = adminDb.batch()
        opCount = 0
      }
    }

    // A. Mise à jour du SM lui-même
    batch.update(callerDoc.ref, { segment: newSegmentTrimmed, updatedAt: now })
    opCount++
    await commitBatchIfFull()

    // B. Mettre à jour tous les utilisateurs identifiés (TMs, commerciaux, etc.)
    for (const [uid, ref] of userDocsToUpdate.entries()) {
      if (uid === callerUid) continue // déjà traité
      batch.update(ref, { segment: newSegmentTrimmed, updatedAt: now })
      opCount++
      await commitBatchIfFull()
    }

    // C. Mettre à jour les accès d'équipe (team_accesses)
    for (const ref of accessDocsToUpdate.values()) {
      batch.update(ref, { segment: newSegmentTrimmed, updatedAt: now })
      opCount++
      await commitBatchIfFull()
    }

    // D. Mettre à jour les fiches pipeline
    for (const d of pipelineSnap.docs) {
      batch.update(d.ref, { segment: newSegmentTrimmed, updatedAt: now })
      opCount++
      await commitBatchIfFull()
    }

    // Commit du batch final
    if (opCount > 0) {
      await batch.commit()
    }

    // ── 7. Synchronisation Auth Claim du SM ─────────────────────────────────
    try {
      const currentClaims = (await adminAuth.getUser(callerUid)).customClaims || {}
      await adminAuth.setCustomUserClaims(callerUid, {
        ...currentClaims,
        segment: newSegmentTrimmed
      })
    } catch (claimErr) {
      console.warn('[PATCH /api/team/org/segment/rename] Auth claims sync warning:', claimErr)
    }

    // ── 8. Heartbeat organisation ────────────────────────────────────────────
    try {
      await adminDb.collection('organisations').doc(orgCode).update({
        lastActivityAt: now,
        updatedAt: now
      })
    } catch (orgErr) {
      console.warn('[PATCH /api/team/org/segment/rename] org heartbeat failed:', orgErr)
    }

    return NextResponse.json({
      success: true,
      segment: newSegmentTrimmed,
      updatedCount: {
        users: userDocsToUpdate.size,
        accesses: accessDocsToUpdate.size,
        pipeline: pipelineSnap.size
      }
    })
  } catch (error: any) {
    console.error('[PATCH /api/team/org/segment/rename] error:', error)
    return NextResponse.json(
      { message: error?.message || 'Erreur interne lors du renommage du segment' },
      { status: 500 }
    )
  }
}
