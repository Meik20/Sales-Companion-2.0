export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

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

function extractName(d: Record<string, unknown>): string {
  return ((d.name as string) || (d.companyName as string) || (d.raisonSociale as string) || '').trim()
}

const isFirestoreId = (s: string) => /^[A-Za-z0-9]{15,30}$/.test((s ?? '').trim())
const isEmailLike   = (s: string) => typeof s === 'string' && s.includes('@') && !s.includes(' ')

/**
 * POST /api/team/assignments/repair  v6
 *
 * Phase A — Email→UID fix (direct):
 *   Scan ALL pipeline items where userId looks like an email (contains @).
 *   Call Firebase Auth getUserByEmail() to get the real UID.
 *   Update userId + assignedTo to the real UID.
 *   This fixes "kevineyoum@entreprise" stored as userId.
 *
 * Phase B — Fix memberId in team_assignments:
 *   For each team_assignment where memberId is email-like,
 *   resolve the real UID and patch the document.
 *   Then verify the linked pipelineEntryId has the correct userId.
 *
 * Phase C — Global name patch:
 *   Fix companyName that are raw Firestore IDs.
 *
 * Returns: { uidFixed, nameFixed, skipped, errors }
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

    let uidFixed  = 0
    let nameFixed = 0
    let skipped   = 0
    const errors: string[] = []

    // Cache email → UID to avoid repeated Auth calls
    const emailToUid = new Map<string, string>()

    async function resolveUid(email: string): Promise<string | null> {
      if (emailToUid.has(email)) return emailToUid.get(email)!
      try {
        // First try: look up in team_accesses by accessId
        const taSnap = await adminDb
          .collection('team_accesses')
          .where('accessId', '==', email)
          .limit(1).get()
        if (!taSnap.empty) {
          const uid = taSnap.docs[0]!.data().firebaseUid as string | undefined
          if (uid) { emailToUid.set(email, uid); return uid }
        }
        // Second try: look up in users by email
        const usersSnap = await adminDb
          .collection('users')
          .where('email', '==', email)
          .limit(1).get()
        if (!usersSnap.empty) {
          const uid = usersSnap.docs[0]!.id
          emailToUid.set(email, uid); return uid
        }
        // Third try: Firebase Auth
        const record = await adminAuth.getUserByEmail(email)
        emailToUid.set(email, record.uid); return record.uid
      } catch {
        return null
      }
    }

    // ── PHASE A: Fix pipeline items with email-like userId ────────────────
    // Get ALL pipeline items (full scan) — email userId can be anywhere
    const allPipelineSnap = await adminDb.collection('pipeline').get()

    for (const doc of allPipelineSnap.docs) {
      const d = doc.data()
      const currentUserId: string  = d.userId ?? ''
      const currentAssignedTo: string = d.assignedTo ?? ''
      const currentName: string    = d.companyName ?? d.name ?? ''

      const needsUidFix = isEmailLike(currentUserId) || isEmailLike(currentAssignedTo)
      const needsNameFix = isFirestoreId(currentName)

      if (!needsUidFix && !needsNameFix) { skipped++; continue }

      const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }

      // Fix userId
      if (isEmailLike(currentUserId)) {
        const uid = await resolveUid(currentUserId)
        if (uid) {
          updates.userId    = uid
          updates.assignedTo = uid
          if (!d.managerUid) updates.managerUid = managerUid
          uidFixed++
        }
      }

      // Fix assignedTo separately if different from userId
      if (isEmailLike(currentAssignedTo) && currentAssignedTo !== currentUserId) {
        const uid = await resolveUid(currentAssignedTo)
        if (uid) { updates.assignedTo = uid; uidFixed++ }
      }

      // Fix companyName
      if (needsNameFix) {
        const sourceId: string = d.sourceId ?? d.sourceProspectId ?? d.companyId ?? currentName
        const prospectData = await resolveProspect(adminDb, sourceId)
        if (prospectData) {
          const realName = extractName(prospectData)
          if (realName) {
            updates.companyName   = realName
            updates.name          = realName
            updates.companySector = (prospectData.companySector as string) ?? (prospectData.sector as string) ?? d.companySector ?? null
            updates.companyCity   = (prospectData.companyCity   as string) ?? (prospectData.city   as string) ?? d.companyCity   ?? null
            updates.companyPhone  = (prospectData.companyPhone  as string) ?? (prospectData.phone  as string) ?? d.companyPhone  ?? null
            updates.companyEmail  = (prospectData.companyEmail  as string) ?? (prospectData.email  as string) ?? d.companyEmail  ?? null
            nameFixed++
          }
        }
      }

      if (Object.keys(updates).length > 1) {
        try { await doc.ref.update(updates) } catch (err) {
          errors.push(`pipeline ${doc.id}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }

    // ── PHASE B: Fix team_assignments + verify their pipeline entries ─────
    const teamSnap = await adminDb
      .collection('team_assignments')
      .where('managerUid', '==', managerUid)
      .get()

    for (const aDoc of teamSnap.docs) {
      const a = aDoc.data()
      const rawMemberId: string    = a.memberId ?? ''
      const pipelineEntryId: string = a.pipelineEntryId ?? ''
      const pipelineItemId: string  = a.pipelineItemId ?? ''

      // Resolve memberId to real UID
      let realMemberId = rawMemberId
      if (isEmailLike(rawMemberId)) {
        const uid = await resolveUid(rawMemberId)
        if (uid) {
          realMemberId = uid
          // Patch the assignment doc itself
          try {
            await aDoc.ref.update({ memberId: uid, updatedAt: FieldValue.serverTimestamp() })
          } catch { /* ignore */ }
        }
      }

      if (!pipelineEntryId) {
        // Create the missing pipeline item for this member
        if (!pipelineItemId) continue
        const prospectData = await resolveProspect(adminDb, pipelineItemId)
        if (!prospectData) continue
        const companyName = extractName(prospectData) || pipelineItemId
        try {
          const newRef = adminDb.collection('pipeline').doc()
          await newRef.set({
            id: newRef.id, userId: realMemberId, assignedTo: realMemberId, managerUid,
            companyName, name: companyName,
            companySector: (prospectData.companySector as string) ?? null,
            companyCity:   (prospectData.companyCity   as string) ?? null,
            companyPhone:  (prospectData.companyPhone  as string) ?? null,
            companyEmail:  (prospectData.companyEmail  as string) ?? null,
            status: 'prospection', sourceProspectId: pipelineItemId, sourceId: pipelineItemId,
            assignedBy: managerUid, assignedByName: managerName, assignmentId: aDoc.id,
            createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
          })
          await aDoc.ref.update({ pipelineEntryId: newRef.id })
          uidFixed++
        } catch (err) {
          errors.push(`create entry for ${rawMemberId}: ${err instanceof Error ? err.message : String(err)}`)
        }
        continue
      }

      // Verify the linked pipeline entry has the correct userId
      try {
        const entryDoc = await adminDb.collection('pipeline').doc(pipelineEntryId).get()
        if (entryDoc.exists) {
          const ed = entryDoc.data()!
          const entryUpdates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
          let changed = false

          if (isEmailLike(ed.userId as string) || ed.userId !== realMemberId) {
            entryUpdates.userId = realMemberId
            entryUpdates.assignedTo = realMemberId
            changed = true
            uidFixed++
          }
          // Fix name if needed
          if (isFirestoreId(ed.companyName as string ?? '')) {
            const sourceId = ed.sourceId ?? ed.sourceProspectId ?? pipelineItemId
            const pd = await resolveProspect(adminDb, sourceId as string)
            if (pd) {
              const n = extractName(pd)
              if (n) { entryUpdates.companyName = n; entryUpdates.name = n; nameFixed++; changed = true }
            }
          }
          if (changed) await entryDoc.ref.update(entryUpdates)
        } else {
          // Entry doesn't exist — create it
          const prospectData = await resolveProspect(adminDb, pipelineItemId)
          if (prospectData) {
            const companyName = extractName(prospectData) || pipelineItemId
            const newRef = adminDb.collection('pipeline').doc(pipelineEntryId) // use same ID
            await newRef.set({
              id: pipelineEntryId, userId: realMemberId, assignedTo: realMemberId, managerUid,
              companyName, name: companyName,
              status: 'prospection', sourceProspectId: pipelineItemId, sourceId: pipelineItemId,
              assignedBy: managerUid, assignedByName: managerName, assignmentId: aDoc.id,
              createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
            })
            uidFixed++
          }
        }
      } catch (err) {
        errors.push(`entry ${pipelineEntryId}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({ uidFixed, nameFixed, skipped, errors })
  } catch (error) {
    console.error('[repair POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
