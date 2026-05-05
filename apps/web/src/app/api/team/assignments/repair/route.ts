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

/**
 * POST /api/team/assignments/repair  v4
 *
 * Global scan — does NOT filter by managerUid so it catches all malformed items
 * regardless of which system created them.
 *
 * Phase 1 — Scan ALL pipeline items whose companyName is a raw Firestore ID.
 *           Re-resolve from manager_prospects / pipeline / imported_prospects and patch.
 *
 * Phase 2 — For each assignment in `team_assignments` and `assignments` collections,
 *           ensure the member has a pipeline item. Creates missing ones.
 *
 * Returns: { patched, repaired, skipped, errors }
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

    let patched  = 0
    let repaired = 0
    let skipped  = 0
    const errors: string[] = []

    // ── PHASE 1: Global name patch ────────────────────────────────────────
    // Scan ALL pipeline items for this manager (via managerUid) AND all
    // items where the name looks like a Firestore ID
    const [byManager, allPipeline] = await Promise.all([
      adminDb.collection('pipeline').where('managerUid', '==', managerUid).get(),
      adminDb.collection('pipeline').get(), // full scan to catch orphans
    ])

    // Merge unique docs — prefer byManager, supplement with full scan
    const docMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
    allPipeline.docs.forEach((d) => docMap.set(d.id, d))
    byManager.docs.forEach((d) => docMap.set(d.id, d))

    for (const doc of docMap.values()) {
      const d = doc.data()
      const currentName: string = d.companyName ?? d.name ?? ''
      if (!isFirestoreId(currentName)) continue

      // Find the source ID to look up
      const sourceId: string = d.sourceId ?? d.sourceProspectId ?? d.companyId ?? currentName

      try {
        const prospectData = await resolveProspect(adminDb, sourceId)
        if (!prospectData) { skipped++; continue }

        const realName = extractName(prospectData)
        if (!realName) { skipped++; continue }

        await doc.ref.update({
          companyName:   realName,
          name:          realName,
          companySector: (prospectData.companySector as string) ?? (prospectData.sector   as string) ?? d.companySector ?? null,
          companyCity:   (prospectData.companyCity   as string) ?? (prospectData.city     as string) ?? d.companyCity   ?? null,
          companyPhone:  (prospectData.companyPhone  as string) ?? (prospectData.phone    as string) ?? d.companyPhone  ?? null,
          companyEmail:  (prospectData.companyEmail  as string) ?? (prospectData.email    as string) ?? d.companyEmail  ?? null,
          updatedAt:     FieldValue.serverTimestamp(),
        })
        patched++
      } catch (err) {
        errors.push(`patch ${doc.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // ── PHASE 2: Create missing member pipeline items ─────────────────────
    // Query both assignment collections for this manager
    const [teamSnap, legacySnap] = await Promise.all([
      adminDb.collection('team_assignments').where('managerUid', '==', managerUid).get(),
      adminDb.collection('assignments').where('managerUid', '==', managerUid).get(),
    ])

    // Process team_assignments (new system)
    for (const aDoc of teamSnap.docs) {
      const a = aDoc.data()
      const memberId: string      = a.memberId ?? ''
      const pipelineItemId: string = a.pipelineItemId ?? ''
      const pipelineEntryId: string = a.pipelineEntryId ?? ''
      if (!memberId || !pipelineItemId) { skipped++; continue }

      // Check if the member pipeline entry still exists
      if (pipelineEntryId) {
        const existing = await adminDb.collection('pipeline').doc(pipelineEntryId).get()
        if (existing.exists) { skipped++; continue }
      }

      // Check by sourceProspectId
      const existingSnap = await adminDb.collection('pipeline')
        .where('userId', '==', memberId)
        .where('sourceProspectId', '==', pipelineItemId)
        .limit(1).get()
      if (!existingSnap.empty) { skipped++; continue }

      // Resolve prospect data
      const prospectData = await resolveProspect(adminDb, pipelineItemId)
      if (!prospectData) { skipped++; continue }

      const companyName = extractName(prospectData) || pipelineItemId

      try {
        const newRef = adminDb.collection('pipeline').doc()
        await newRef.set({
          id:           newRef.id,
          userId:       memberId,
          assignedTo:   memberId,
          managerUid,
          companyName,
          name:         companyName,
          companySector: (prospectData.companySector as string) ?? (prospectData.sector as string) ?? null,
          companyCity:   (prospectData.companyCity   as string) ?? (prospectData.city   as string) ?? null,
          companyPhone:  (prospectData.companyPhone  as string) ?? (prospectData.phone  as string) ?? null,
          companyEmail:  (prospectData.companyEmail  as string) ?? (prospectData.email  as string) ?? null,
          status:        'prospection',
          sourceProspectId: pipelineItemId,
          sourceId:      pipelineItemId,
          assignedBy:    managerUid,
          assignedByName: managerName,
          assignmentId:  aDoc.id,
          createdAt:     FieldValue.serverTimestamp(),
          updatedAt:     FieldValue.serverTimestamp(),
        })
        // Update assignment to point to new entry
        await aDoc.ref.update({ pipelineEntryId: newRef.id })
        repaired++
      } catch (err) {
        errors.push(`repair team_assignment ${aDoc.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // Process legacy assignments (old Express system)
    for (const aDoc of legacySnap.docs) {
      const a = aDoc.data()
      const assigneeUid: string   = a.assigneeUid ?? ''
      const prospectIds: string[] = Array.isArray(a.prospectIds) ? a.prospectIds : []
      if (!assigneeUid || prospectIds.length === 0) { skipped++; continue }

      for (const prospectId of prospectIds) {
        const existSnap = await adminDb.collection('pipeline')
          .where('userId', '==', assigneeUid)
          .where('sourceId', '==', prospectId)
          .limit(1).get()
        if (!existSnap.empty) { skipped++; continue }

        const prospectData = await resolveProspect(adminDb, prospectId)
        if (!prospectData) { skipped++; continue }

        const companyName = extractName(prospectData) || prospectId

        try {
          const newRef = adminDb.collection('pipeline').doc()
          await newRef.set({
            id:           newRef.id,
            userId:       assigneeUid,
            assignedTo:   assigneeUid,
            managerUid,
            companyName,
            name:         companyName,
            companySector: (prospectData.companySector as string) ?? (prospectData.sector as string) ?? null,
            companyCity:   (prospectData.companyCity   as string) ?? (prospectData.city   as string) ?? null,
            companyPhone:  (prospectData.companyPhone  as string) ?? (prospectData.phone  as string) ?? null,
            companyEmail:  (prospectData.companyEmail  as string) ?? (prospectData.email  as string) ?? null,
            status:        'prospection',
            sourceId:      prospectId,
            assignedBy:    managerUid,
            assignedByName: managerName,
            assignmentId:  aDoc.id,
            createdAt:     FieldValue.serverTimestamp(),
            updatedAt:     FieldValue.serverTimestamp(),
          })
          repaired++
        } catch (err) {
          errors.push(`repair legacy ${prospectId}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }

    return NextResponse.json({ patched, repaired, skipped, errors })
  } catch (error) {
    console.error('[team/assignments/repair POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
