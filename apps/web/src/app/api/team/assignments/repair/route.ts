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
    let protectedCount = 0
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
    //
    // Statuts protégés : un prospect dans une phase avancée ne doit JAMAIS
    // être supprimé, même s'il semble orphelin selon d'autres critères.
    const PROTECTED_STATUSES = new Set([
      // Étape finale — valeurs réelles stockées en base
      'conclue',
      'conclusion',
      // Étape intermédiaire avancée
      'negociation',
      'negotiation',
      'négociation'
    ])

    // Construire un ensemble élargi de tous les prospects rattachés au manager :
    //   1. pipeline items dont userId == managerUid
    //   2. pipeline items dont managerUid == managerUid (prospects assignés aux membres)
    //   3. sourceProspectId référencés par les entrées pipeline des membres
    const [managerPipelineSnap, memberPipelineSnap] = await Promise.all([
      adminDb.collection('pipeline').where('userId', '==', managerUid).get(),
      adminDb.collection('pipeline').where('managerUid', '==', managerUid).get()
    ])

    // Set des IDs connus depuis le pipeline manager (par doc.id)
    const managerPipelineIds = new Set<string>(managerPipelineSnap.docs.map((d) => d.id))

    // Map: pipelineEntryId → status pour protéger les stades avancés des membres
    const memberPipelineStatusMap = new Map<string, string>()
    // Set des sourceProspectId référencés par les membres (pour détecter les vrais orphelins)
    const memberSourceProspectIds = new Set<string>()
    for (const doc of memberPipelineSnap.docs) {
      const d = doc.data()
      const status = ((d.status as string) ?? '').toLowerCase()
      memberPipelineStatusMap.set(doc.id, status)
      const srcId = (d.sourceProspectId as string) ?? (d.companyId as string) ?? ''
      if (srcId) memberSourceProspectIds.add(srcId)
    }

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
      const pipelineEntryId: string = a.data.pipelineEntryId ?? ''
      const key = `${pId}_${mId}`

      // ── Dédoublonnage : garder seulement le plus récent ─────────────────
      if (seenAssignments.has(key)) {
        await a.ref.delete()
        deletedDupes++
        continue
      }
      seenAssignments.add(key)

      // ── Protection absolue : vérifier le statut de l'entrée pipeline du membre ──
      if (pipelineEntryId) {
        const entryStatus = memberPipelineStatusMap.get(pipelineEntryId)
        if (entryStatus !== undefined && PROTECTED_STATUSES.has(entryStatus)) {
          // Prospect dans une phase avancée → JAMAIS supprimé
          protectedCount++
          continue
        }
        // Si l'entrée pipeline n'est pas encore en mémoire, la lire directement
        if (entryStatus === undefined) {
          const entryDoc = await adminDb.collection('pipeline').doc(pipelineEntryId).get()
          if (entryDoc.exists) {
            const entryStatus2 = ((entryDoc.data()?.status as string) ?? '').toLowerCase()
            if (PROTECTED_STATUSES.has(entryStatus2)) {
              protectedCount++
              continue
            }
          }
        }
      }

      // ── Détection "orphelin" : cherche l'existence du prospect dans toutes les sources ──
      const inManagerPipeline = managerPipelineIds.has(pId)
      const referencedByMember = memberSourceProspectIds.has(pId)

      let existsInSources = false
      if (!inManagerPipeline && !referencedByMember) {
        const [mDoc, iDoc, pDoc] = await Promise.all([
          adminDb.collection('manager_prospects').doc(pId).get(),
          adminDb.collection('imported_prospects').doc(pId).get(),
          // Vérifier aussi si le pId est lui-même un doc pipeline valide
          adminDb.collection('pipeline').doc(pId).get()
        ])
        existsInSources = mDoc.exists || iDoc.exists || pDoc.exists
      }

      // ── Suppression uniquement si réellement orphelin ET non protégé ──────
      if (!inManagerPipeline && !referencedByMember && !existsInSources) {
        await a.ref.delete()
        if (pipelineEntryId) {
          await adminDb
            .collection('pipeline')
            .doc(pipelineEntryId)
            .delete()
            .catch(() => {})
        }
        deletedStale++
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      uidFixed,
      nameFixed,
      skipped,
      deletedDupes,
      deletedStale,
      protected: protectedCount,
      totalFixed: uidFixed + nameFixed + deletedDupes + deletedStale,
      errors
    })
  } catch (error) {
    console.error('[repair POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
