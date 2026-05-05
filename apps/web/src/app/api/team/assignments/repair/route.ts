import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/** Look up prospect data across all source collections */
async function resolveProspect(
  adminDb: FirebaseFirestore.Firestore,
  prospectId: string
): Promise<Record<string, unknown> | null> {
  // 1. manager_prospects — primary CSV import collection
  const mDoc = await adminDb.collection('manager_prospects').doc(prospectId).get()
  if (mDoc.exists) return mDoc.data() ?? null

  // 2. pipeline — manually added prospects
  const pDoc = await adminDb.collection('pipeline').doc(prospectId).get()
  if (pDoc.exists) return pDoc.data() ?? null

  // 3. imported_prospects — legacy collection name
  const iDoc = await adminDb.collection('imported_prospects').doc(prospectId).get()
  if (iDoc.exists) return iDoc.data() ?? null

  return null
}

/** Extract a display name from raw prospect data */
function extractName(data: Record<string, unknown>): string {
  const raw =
    (data.name as string) ||
    (data.companyName as string) ||
    (data.raisonSociale as string) ||
    ''
  return raw.trim() || 'Inconnu'
}

/** Detect Firestore auto-IDs (20-char alphanumeric strings, no spaces) */
const isFirestoreId = (s: string) => /^[A-Za-z0-9]{15,30}$/.test(s.trim())

/** Detect email-like strings used as user IDs by mistake */
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim())

/**
 * POST /api/team/assignments/repair  v3
 *
 * Phase 0 — For each assignment, resolve the true Firebase UID of the member.
 *            Handles legacy assignments where assigneeUid is an email or missing.
 *
 * Phase 1 — Create missing pipeline items for the member using the resolved UID
 *            and real prospect data from manager_prospects / pipeline / imported_prospects.
 *
 * Phase 2 — Patch existing pipeline items whose companyName is a raw Firestore ID.
 *            Re-resolves name, phone, email, sector, city from source collections.
 *
 * Phase 3 — Patch existing pipeline items whose userId is an email instead of a
 *            Firebase UID (legacy bug). Replaces with the correct Firebase UID.
 *
 * Returns: { repaired, patched, uidFixed, skipped, errors }
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
      const managerDoc = await adminDb.collection('users').doc(managerUid).get()
      managerName = (managerDoc.data()?.name ?? managerDoc.data()?.email ?? '') as string
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const assignmentsSnap = await adminDb
      .collection('assignments')
      .where('managerUid', '==', managerUid)
      .get()

    let repaired = 0
    let patched   = 0
    let uidFixed  = 0
    let skipped   = 0
    const errors: string[] = []

    // ── Cache: email → Firebase UID ────────────────────────────────
    const uidCache = new Map<string, string | null>()

    async function resolveFirebaseUid(rawUid: string): Promise<string | null> {
      if (!rawUid) return null
      if (!isEmail(rawUid)) return rawUid // already a proper UID

      if (uidCache.has(rawUid)) return uidCache.get(rawUid)!

      try {
        // 1. Try team_accesses by email
        const accessSnap = await adminDb
          .collection('team_accesses')
          .where('email', '==', rawUid)
          .limit(1)
          .get()

        if (!accessSnap.empty) {
          const uid = (accessSnap.docs[0].data()?.firebaseUid as string) || null
          if (uid && !isEmail(uid)) {
            uidCache.set(rawUid, uid)
            return uid
          }
        }

        // 2. Try Firebase Auth by email
        const userRecord = await adminAuth.getUserByEmail(rawUid)
        const uid = userRecord.uid
        uidCache.set(rawUid, uid)
        return uid
      } catch {
        uidCache.set(rawUid, null)
        return null
      }
    }

    // ── Phase 0+1: Resolve UID and create missing pipeline items ──
    for (const assignDoc of assignmentsSnap.docs) {
      const data = assignDoc.data()
      const rawAssigneeUid: string = data.assigneeUid ?? data.assigneeId ?? ''
      const prospectIds: string[] = Array.isArray(data.prospectIds) ? data.prospectIds : []

      if (!rawAssigneeUid) { skipped++; continue }

      // Phase 0: resolve true Firebase UID
      const assigneeUid = await resolveFirebaseUid(rawAssigneeUid)
      if (!assigneeUid) {
        errors.push(`UID introuvable pour l'assigné "${rawAssigneeUid}" (doc ${assignDoc.id})`)
        skipped++
        continue
      }

      // Update the assignment doc if UID changed
      if (assigneeUid !== rawAssigneeUid) {
        await assignDoc.ref.update({ assigneeUid })
      }

      for (const prospectId of prospectIds) {
        try {
          // Check existence using both raw and resolved UID
          const [s1, s2, s3] = await Promise.all([
            adminDb.collection('pipeline')
              .where('userId', '==', assigneeUid)
              .where('sourceId', '==', prospectId)
              .limit(1).get(),
            adminDb.collection('pipeline')
              .where('assignedTo', '==', assigneeUid)
              .where('sourceId', '==', prospectId)
              .limit(1).get(),
            // Also check with the raw (email) userId in case of legacy items
            rawAssigneeUid !== assigneeUid
              ? adminDb.collection('pipeline')
                .where('userId', '==', rawAssigneeUid)
                .where('sourceId', '==', prospectId)
                .limit(1).get()
              : Promise.resolve({ empty: true } as FirebaseFirestore.QuerySnapshot),
          ])

          if (!s1.empty || !s2.empty) {
            skipped++
            continue
          }

          // If a legacy item exists with email userId, fix it (Phase 3 inline)
          if (!s3.empty) {
            const legacyDoc = s3.docs[0]
            if (legacyDoc) {
              await legacyDoc.ref.update({
                userId: assigneeUid,
                assignedTo: assigneeUid,
                updatedAt: FieldValue.serverTimestamp(),
              })
              uidFixed++
            }
            continue
          }

          // Resolve prospect data
          const prospectData = await resolveProspect(adminDb, prospectId)
          if (!prospectData) {
            errors.push(`Prospect ${prospectId} introuvable dans toutes les collections`)
            skipped++
            continue
          }

          const companyName = extractName(prospectData)

          // Create missing pipeline item
          const newRef = adminDb.collection('pipeline').doc()
          await newRef.set({
            id:            newRef.id,
            userId:        assigneeUid,
            assignedTo:    assigneeUid,
            managerUid,
            companyId:     (prospectData.companyId as string) ?? (prospectData.id as string) ?? prospectId,
            companyName,
            companySector: (prospectData.companySector as string) ?? (prospectData.sector as string)    ?? null,
            companyCity:   (prospectData.companyCity   as string) ?? (prospectData.city    as string)   ?? null,
            companyPhone:  (prospectData.companyPhone  as string) ?? (prospectData.phone   as string)   ?? null,
            companyEmail:  (prospectData.companyEmail  as string) ?? (prospectData.email   as string)   ?? null,
            status:        'prospection',
            notes:         (prospectData.notes as string) ?? null,
            nextFollowUp:  (prospectData.nextFollowUp as string) ?? null,
            sourceId:      prospectId,
            assignedBy:    managerUid,
            assignedByName: managerName,
            assignmentId:  assignDoc.id,
            createdAt:     FieldValue.serverTimestamp(),
            updatedAt:     FieldValue.serverTimestamp(),
          })

          repaired++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`Erreur prospect ${prospectId}: ${msg}`)
        }
      }
    }

    // ── Phase 2+3: Patch existing pipeline items with bad data ────
    const memberPipelineSnap = await adminDb
      .collection('pipeline')
      .where('managerUid', '==', managerUid)
      .get()

    for (const doc of memberPipelineSnap.docs) {
      const d = doc.data()
      const currentName: string = d.companyName ?? ''
      const currentUserId: string = d.userId ?? ''
      const sourceId: string = d.sourceId ?? ''

      const needsNameFix   = isFirestoreId(currentName) && !!sourceId
      const needsUidFix    = isEmail(currentUserId)

      if (!needsNameFix && !needsUidFix) continue

      try {
        const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }

        // Phase 2: fix name
        if (needsNameFix) {
          const prospectData = await resolveProspect(adminDb, sourceId)
          if (prospectData) {
            const realName = extractName(prospectData)
            if (realName !== 'Inconnu') {
              updates.companyName   = realName
              updates.companySector = (prospectData.companySector as string) ?? (prospectData.sector as string) ?? d.companySector ?? null
              updates.companyCity   = (prospectData.companyCity   as string) ?? (prospectData.city   as string) ?? d.companyCity   ?? null
              updates.companyPhone  = (prospectData.companyPhone  as string) ?? (prospectData.phone  as string) ?? d.companyPhone  ?? null
              updates.companyEmail  = (prospectData.companyEmail  as string) ?? (prospectData.email  as string) ?? d.companyEmail  ?? null
              patched++
            }
          }
        }

        // Phase 3: fix userId (email → Firebase UID)
        if (needsUidFix) {
          const realUid = await resolveFirebaseUid(currentUserId)
          if (realUid && realUid !== currentUserId) {
            updates.userId     = realUid
            updates.assignedTo = realUid
            uidFixed++
          }
        }

        if (Object.keys(updates).length > 1) {
          await doc.ref.update(updates)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Patch échoué pour ${doc.id}: ${msg}`)
      }
    }

    return NextResponse.json({ repaired, patched, uidFixed, skipped, errors })
  } catch (error) {
    console.error('[team/assignments/repair POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
