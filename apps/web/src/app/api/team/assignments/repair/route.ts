import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/** Resolve prospect from all source collections */
async function resolveProspect(
  adminDb: FirebaseFirestore.Firestore,
  id: string
): Promise<Record<string, unknown> | null> {
  const [m, p, i] = await Promise.all([
    adminDb.collection('manager_prospects').doc(id).get(),
    adminDb.collection('pipeline').doc(id).get(),
    adminDb.collection('imported_prospects').doc(id).get(),
  ])
  if (m.exists) return m.data() ?? null
  if (p.exists) return p.data() ?? null
  if (i.exists) return i.data() ?? null
  return null
}

function extractName(data: Record<string, unknown>): string {
  return (
    ((data.name as string) || (data.companyName as string) || (data.raisonSociale as string) || '').trim() || ''
  )
}

/** Detect raw Firestore auto-IDs (15-30 alphanum, no spaces/dashes) */
const isFirestoreId = (s: string) => /^[A-Za-z0-9]{15,30}$/.test((s ?? '').trim())
/** Detect access-ID-like strings (email or slug like "kevineyoum@entreprise") */
const isAccessId   = (s: string) => (s ?? '').includes('@') || /^[a-z][a-z0-9_.-]{2,}@[a-z]/.test(s)

/**
 * POST /api/team/assignments/repair  v5
 *
 * Phase 0 — UID normalization:
 *   For every member in team_accesses (under this manager), find pipeline items
 *   where userId = accessId (email/slug) instead of the real firebaseUid.
 *   Patch userId + assignedTo to the real Firebase UID.
 *   This is the root cause of "member sees 0 in pipeline".
 *
 * Phase 1 — Name patch (global):
 *   Scan ALL pipeline items where companyName is a raw Firestore ID.
 *   Re-resolve the real name from manager_prospects / pipeline / imported_prospects.
 *
 * Phase 2 — Create missing pipeline items:
 *   For each assignment in team_assignments + assignments (legacy),
 *   ensure the member pipeline item exists with the correct userId.
 *
 * Returns: { uidFixed, patched, repaired, skipped, errors }
 */
export async function POST(request: NextRequest) {
  try {
    const { adminDb, adminAuth } = await getAdmin()

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })

    let managerUid: string
    let managerName = ''
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      managerUid = decoded.uid
      const mDoc = await adminDb.collection('users').doc(managerUid).get()
      managerName = (mDoc.data()?.name ?? mDoc.data()?.email ?? '') as string
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    let uidFixed = 0
    let patched  = 0
    let repaired = 0
    let skipped  = 0
    const errors: string[] = []

    // ── PHASE 0: UID Normalization ────────────────────────────────────────
    // Get all team members for this manager from team_accesses
    const teamAccessSnap = await adminDb
      .collection('team_accesses')
      .where('managerUid', '==', managerUid)
      .get()

    // Build map: accessId → firebaseUid
    const accessToUid = new Map<string, string>()
    for (const doc of teamAccessSnap.docs) {
      const d = doc.data()
      const accessId: string  = d.accessId ?? doc.id ?? ''
      const firebaseUid: string = d.firebaseUid ?? ''
      if (accessId && firebaseUid && accessId !== firebaseUid) {
        accessToUid.set(accessId, firebaseUid)
      }
    }

    // For each accessId → firebaseUid mapping, fix pipeline items
    for (const [accessId, firebaseUid] of accessToUid.entries()) {
      try {
        // Find pipeline items where userId = accessId (wrong) or assignedTo = accessId
        const [byUserId, byAssignedTo] = await Promise.all([
          adminDb.collection('pipeline').where('userId',     '==', accessId).get(),
          adminDb.collection('pipeline').where('assignedTo', '==', accessId).get(),
        ])

        const docsToFix = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
        byUserId.docs.forEach(d => docsToFix.set(d.id, d))
        byAssignedTo.docs.forEach(d => docsToFix.set(d.id, d))

        for (const doc of docsToFix.values()) {
          const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
          const d = doc.data()

          if (d.userId === accessId)     updates.userId     = firebaseUid
          if (d.assignedTo === accessId) updates.assignedTo = firebaseUid
          if (!d.managerUid)             updates.managerUid = managerUid

          if (Object.keys(updates).length > 1) {
            await doc.ref.update(updates)
            uidFixed++
          }
        }
      } catch (err) {
        errors.push(`UID fix for ${accessId}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // ── PHASE 1: Global name patch ────────────────────────────────────────
    // Scan ALL pipeline items for this manager + global scan for orphans
    const [byManager, allPipeline] = await Promise.all([
      adminDb.collection('pipeline').where('managerUid', '==', managerUid).get(),
      adminDb.collection('pipeline').get(),
    ])

    const docMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
    allPipeline.docs.forEach((d) => docMap.set(d.id, d))
    byManager.docs.forEach((d) => docMap.set(d.id, d))

    for (const doc of docMap.values()) {
      const d = doc.data()
      const currentName: string = d.companyName ?? d.name ?? ''
      if (!isFirestoreId(currentName)) continue

      const sourceId: string = d.sourceId ?? d.sourceProspectId ?? d.companyId ?? currentName
      try {
        const prospectData = await resolveProspect(adminDb, sourceId)
        if (!prospectData) { skipped++; continue }

        const realName = extractName(prospectData)
        if (!realName) { skipped++; continue }

        await doc.ref.update({
          companyName:   realName,
          name:          realName,
          companySector: (prospectData.companySector as string) ?? (prospectData.sector as string) ?? d.companySector ?? null,
          companyCity:   (prospectData.companyCity   as string) ?? (prospectData.city   as string) ?? d.companyCity   ?? null,
          companyPhone:  (prospectData.companyPhone  as string) ?? (prospectData.phone  as string) ?? d.companyPhone  ?? null,
          companyEmail:  (prospectData.companyEmail  as string) ?? (prospectData.email  as string) ?? d.companyEmail  ?? null,
          updatedAt:     FieldValue.serverTimestamp(),
        })
        patched++
      } catch (err) {
        errors.push(`patch ${doc.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // ── PHASE 2: Create missing pipeline items ────────────────────────────
    const [teamSnap, legacySnap] = await Promise.all([
      adminDb.collection('team_assignments').where('managerUid', '==', managerUid).get(),
      adminDb.collection('assignments').where('managerUid', '==', managerUid).get(),
    ])

    // team_assignments (new system)
    for (const aDoc of teamSnap.docs) {
      const a = aDoc.data()
      const rawMemberId: string   = a.memberId ?? ''
      const pipelineItemId: string = a.pipelineItemId ?? ''
      const pipelineEntryId: string = a.pipelineEntryId ?? ''
      if (!rawMemberId || !pipelineItemId) { skipped++; continue }

      // Resolve to real UID if needed
      const memberId = accessToUid.get(rawMemberId) ?? rawMemberId

      if (pipelineEntryId) {
        const existing = await adminDb.collection('pipeline').doc(pipelineEntryId).get()
        if (existing.exists) { skipped++; continue }
      }

      const existingSnap = await adminDb.collection('pipeline')
        .where('userId', '==', memberId)
        .where('sourceProspectId', '==', pipelineItemId)
        .limit(1).get()
      if (!existingSnap.empty) { skipped++; continue }

      const prospectData = await resolveProspect(adminDb, pipelineItemId)
      if (!prospectData) { skipped++; continue }

      const companyName = extractName(prospectData) || pipelineItemId
      try {
        const newRef = adminDb.collection('pipeline').doc()
        await newRef.set({
          id: newRef.id, userId: memberId, assignedTo: memberId, managerUid,
          companyName, name: companyName,
          companySector: (prospectData.companySector as string) ?? (prospectData.sector as string) ?? null,
          companyCity:   (prospectData.companyCity   as string) ?? (prospectData.city   as string) ?? null,
          companyPhone:  (prospectData.companyPhone  as string) ?? (prospectData.phone  as string) ?? null,
          companyEmail:  (prospectData.companyEmail  as string) ?? (prospectData.email  as string) ?? null,
          status: 'prospection', sourceProspectId: pipelineItemId, sourceId: pipelineItemId,
          assignedBy: managerUid, assignedByName: managerName, assignmentId: aDoc.id,
          createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        })
        await aDoc.ref.update({ pipelineEntryId: newRef.id })
        repaired++
      } catch (err) {
        errors.push(`create team_assignment ${aDoc.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // legacy assignments (Express system)
    for (const aDoc of legacySnap.docs) {
      const a = aDoc.data()
      const rawAssigneeUid: string = a.assigneeUid ?? a.assigneeId ?? ''
      const prospectIds: string[]  = Array.isArray(a.prospectIds) ? a.prospectIds : []
      if (!rawAssigneeUid || prospectIds.length === 0) { skipped++; continue }

      // Resolve to real UID
      const assigneeUid = accessToUid.get(rawAssigneeUid) ?? rawAssigneeUid
      if (isAccessId(assigneeUid)) {
        // Still an accessId — try Firebase Auth
        try {
          const userRecord = await adminAuth.getUserByEmail(assigneeUid)
          accessToUid.set(rawAssigneeUid, userRecord.uid)
        } catch {
          errors.push(`Cannot resolve UID for "${rawAssigneeUid}" — member may not have activated`)
          skipped++
          continue
        }
      }

      const resolvedUid = accessToUid.get(rawAssigneeUid) ?? rawAssigneeUid

      for (const prospectId of prospectIds) {
        const existSnap = await adminDb.collection('pipeline')
          .where('userId', '==', resolvedUid)
          .where('sourceId', '==', prospectId)
          .limit(1).get()
        if (!existSnap.empty) { skipped++; continue }

        const prospectData = await resolveProspect(adminDb, prospectId)
        if (!prospectData) { skipped++; continue }

        const companyName = extractName(prospectData) || prospectId
        try {
          const newRef = adminDb.collection('pipeline').doc()
          await newRef.set({
            id: newRef.id, userId: resolvedUid, assignedTo: resolvedUid, managerUid,
            companyName, name: companyName,
            companySector: (prospectData.companySector as string) ?? (prospectData.sector as string) ?? null,
            companyCity:   (prospectData.companyCity   as string) ?? (prospectData.city   as string) ?? null,
            companyPhone:  (prospectData.companyPhone  as string) ?? (prospectData.phone  as string) ?? null,
            companyEmail:  (prospectData.companyEmail  as string) ?? (prospectData.email  as string) ?? null,
            status: 'prospection', sourceId: prospectId,
            assignedBy: managerUid, assignedByName: managerName, assignmentId: aDoc.id,
            createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
          })
          repaired++
        } catch (err) {
          errors.push(`create legacy ${prospectId}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }

    return NextResponse.json({ uidFixed, patched, repaired, skipped, errors })
  } catch (error) {
    console.error('[team/assignments/repair POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
