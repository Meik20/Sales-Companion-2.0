export const dynamic = 'force-dynamic'
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
    adminDb.collection('imported_prospects').doc(id).get()
  ])
  if (m.exists) return m.data() ?? null
  if (p.exists) return p.data() ?? null
  if (i.exists) return i.data() ?? null
  return null
}

function extractName(d: Record<string, unknown>): string {
  return (
    (d.name as string) ||
    (d.companyName as string) ||
    (d.raisonSociale as string) ||
    ''
  ).trim()
}

const isFirestoreId = (s: string) => /^[A-Za-z0-9]{15,30}$/.test((s ?? '').trim())
const isEmailLike = (s: string) => typeof s === 'string' && s.includes('@') && !s.includes(' ')

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
    let nameFixed = 0
    let skipped = 0
    let deletedStale = 0
    let deletedDupes = 0
    const errors: string[] = []

    const emailToUid = new Map<string, string>()
    async function resolveUid(email: string): Promise<string | null> {
      if (emailToUid.has(email)) return emailToUid.get(email)!
      try {
        const taSnap = await adminDb
          .collection('team_accesses')
          .where('accessId', '==', email)
          .limit(1)
          .get()
        if (!taSnap.empty) {
          const uid = taSnap.docs[0]!.data().firebaseUid as string
          if (uid) {
            emailToUid.set(email, uid)
            return uid
          }
        }
        const usersSnap = await adminDb
          .collection('users')
          .where('email', '==', email)
          .limit(1)
          .get()
        if (!usersSnap.empty) {
          const uid = usersSnap.docs[0]!.id
          emailToUid.set(email, uid)
          return uid
        }
        const record = await adminAuth.getUserByEmail(email)
        emailToUid.set(email, record.uid)
        return record.uid
      } catch {
        return null
      }
    }

    // ── PHASE A: Fix pipeline items with email-like userId ────────────────
    const allPipelineSnap = await adminDb.collection('pipeline').get()
    for (const doc of allPipelineSnap.docs) {
      const d = doc.data()
      const currentUserId: string = d.userId ?? ''
      const currentAssignedTo: string = d.assignedTo ?? ''
      const currentName: string = d.companyName ?? d.name ?? ''

      const needsUidFix = isEmailLike(currentUserId) || isEmailLike(currentAssignedTo)
      const needsNameFix = isFirestoreId(currentName)

      if (!needsUidFix && !needsNameFix) {
        skipped++
        continue
      }

      const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
      if (isEmailLike(currentUserId)) {
        const uid = await resolveUid(currentUserId)
        if (uid) {
          updates.userId = uid
          updates.assignedTo = uid
          uidFixed++
        }
      }
      if (isEmailLike(currentAssignedTo) && currentAssignedTo !== currentUserId) {
        const uid = await resolveUid(currentAssignedTo)
        if (uid) {
          updates.assignedTo = uid
          uidFixed++
        }
      }
      if (needsNameFix) {
        const sourceId = d.sourceId ?? d.sourceProspectId ?? d.companyId ?? currentName
        const prospectData = await resolveProspect(adminDb, sourceId)
        if (prospectData) {
          const realName = extractName(prospectData)
          if (realName) {
            updates.companyName = realName
            updates.name = realName
            nameFixed++
          }
        }
      }
      if (Object.keys(updates).length > 1) {
        await doc.ref.update(updates).catch((e) => errors.push(`pipeline ${doc.id}: ${e.message}`))
      }
    }

    // ── PHASE B: Fix team_assignments + verify their pipeline entries ─────
    const teamSnap = await adminDb
      .collection('team_assignments')
      .where('managerUid', '==', managerUid)
      .get()
    for (const aDoc of teamSnap.docs) {
      const a = aDoc.data()
      const rawMemberId: string = a.memberId ?? ''
      const pipelineEntryId: string = a.pipelineEntryId ?? ''
      const pipelineItemId: string = a.pipelineItemId ?? ''

      let realMemberId = rawMemberId
      if (isEmailLike(rawMemberId)) {
        const uid = await resolveUid(rawMemberId)
        if (uid) {
          realMemberId = uid
          await aDoc.ref
            .update({ memberId: uid, updatedAt: FieldValue.serverTimestamp() })
            .catch(() => {})
        }
      }

      if (!pipelineEntryId && pipelineItemId) {
        const prospectData = await resolveProspect(adminDb, pipelineItemId)
        if (prospectData) {
          const companyName = extractName(prospectData) || pipelineItemId
          const newRef = adminDb.collection('pipeline').doc()
          await newRef
            .set({
              id: newRef.id,
              userId: realMemberId,
              assignedTo: realMemberId,
              managerUid,
              companyName,
              name: companyName,
              status: 'prospection',
              sourceProspectId: pipelineItemId,
              assignedBy: managerUid,
              assignedByName: managerName,
              assignmentId: aDoc.id,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            })
            .then(() => aDoc.ref.update({ pipelineEntryId: newRef.id }))
          uidFixed++
        }
      }
    }

    // ── PHASE C: Cleanup (Deduplication & Manager Pipeline Alignment) ─────
    const managerPipelineSnap = await adminDb
      .collection('pipeline')
      .where('userId', '==', managerUid)
      .get()
    const managerPipelineIds = new Set(managerPipelineSnap.docs.map((d) => d.id))

    // Refresh snap for cleanup
    const freshTeamSnap = await adminDb
      .collection('team_assignments')
      .where('managerUid', '==', managerUid)
      .get()
    const seenAssignments = new Set<string>()
    const sortedAssignments = freshTeamSnap.docs
      .map((d) => ({ id: d.id, ref: d.ref, data: d.data() }))
      .sort(
        (a, b) =>
          (b.data.createdAt?.toDate?.()?.getTime() ?? 0) -
          (a.data.createdAt?.toDate?.()?.getTime() ?? 0)
      )

    for (const a of sortedAssignments) {
      const pId = a.data.pipelineItemId as string
      const mId = a.data.memberId as string
      const key = `${pId}_${mId}`

      if (seenAssignments.has(key)) {
        await a.ref.delete()
        deletedDupes++
        continue
      }
      seenAssignments.add(key)

      const inManagerPipeline = managerPipelineIds.has(pId)
      let existsInSources = false
      if (!inManagerPipeline) {
        const [mDoc, iDoc] = await Promise.all([
          adminDb.collection('manager_prospects').doc(pId).get(),
          adminDb.collection('imported_prospects').doc(pId).get()
        ])
        existsInSources = mDoc.exists || iDoc.exists
      }

      if (!inManagerPipeline && !existsInSources) {
        await a.ref.delete()
        if (a.data.pipelineEntryId) {
          await adminDb
            .collection('pipeline')
            .doc(a.data.pipelineEntryId)
            .delete()
            .catch(() => {})
        }
        deletedStale++
      }
    }

    return NextResponse.json({
      uidFixed,
      nameFixed,
      skipped,
      deletedDupes,
      deletedStale,
      totalFixed: uidFixed + nameFixed + deletedDupes + deletedStale,
      errors
    })
  } catch (error) {
    console.error('[repair POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
