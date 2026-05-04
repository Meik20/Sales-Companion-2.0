import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * Resolve a prospect's data from any collection it may exist in.
 * Priority: pipeline > manager_prospects > imported_prospects
 */
async function resolveProspect(
  adminDb: FirebaseFirestore.Firestore,
  prospectId: string
): Promise<Record<string, unknown> | null> {
  // 1. Try pipeline (prospect added manually)
  const pDoc = await adminDb.collection('pipeline').doc(prospectId).get()
  if (pDoc.exists) return pDoc.data() ?? null

  // 2. Try manager_prospects (CSV import — primary collection)
  const mDoc = await adminDb.collection('manager_prospects').doc(prospectId).get()
  if (mDoc.exists) return mDoc.data() ?? null

  // 3. Try imported_prospects (legacy collection name)
  const iDoc = await adminDb.collection('imported_prospects').doc(prospectId).get()
  if (iDoc.exists) return iDoc.data() ?? null

  return null
}

/** Extract a human-readable company name from raw prospect data */
function extractName(data: Record<string, unknown>): string {
  return (
    (data.companyName as string) ||
    (data.name as string) ||
    (data.raisonSociale as string) ||
    'Inconnu'
  )
}

/**
 * POST /api/team/assignments/repair
 *
 * 1. Iterates all 'assignments' docs for the manager.
 * 2. For each prospect that hasn't created a pipeline item for the member → creates it.
 * 3. Also patches existing pipeline items whose companyName looks like a Firestore ID
 *    (no spaces, 20 chars) by resolving the real name from source collections.
 *
 * Returns: { repaired: number, patched: number, skipped: number, errors: string[] }
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
      managerName = managerDoc.data()?.name ?? managerDoc.data()?.email ?? ''
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    // ── Phase 1: Create missing pipeline items ─────────────────────────────
    const assignmentsSnap = await adminDb
      .collection('assignments')
      .where('managerUid', '==', managerUid)
      .get()

    let repaired = 0
    let skipped = 0
    let patched = 0
    const errors: string[] = []

    for (const assignDoc of assignmentsSnap.docs) {
      const data = assignDoc.data()
      const assigneeUid: string = data.assigneeUid ?? ''
      const prospectIds: string[] = Array.isArray(data.prospectIds) ? data.prospectIds : []

      if (!assigneeUid) {
        skipped++
        continue
      }

      for (const prospectId of prospectIds) {
        try {
          // Check if a pipeline item already exists for this member + source prospect
          const [snap1, snap2] = await Promise.all([
            adminDb.collection('pipeline')
              .where('assignedTo', '==', assigneeUid)
              .where('sourceId', '==', prospectId)
              .limit(1)
              .get(),
            adminDb.collection('pipeline')
              .where('userId', '==', assigneeUid)
              .where('sourceId', '==', prospectId)
              .limit(1)
              .get(),
          ])

          if (!snap1.empty || !snap2.empty) {
            skipped++
            continue
          }

          // Resolve prospect data from any source collection
          const prospectData = await resolveProspect(adminDb, prospectId)

          if (!prospectData) {
            errors.push(`Prospect ${prospectId} introuvable dans toutes les collections`)
            skipped++
            continue
          }

          const companyName = extractName(prospectData)

          // Create the missing pipeline item for the member
          const newRef = adminDb.collection('pipeline').doc()
          await newRef.set({
            id: newRef.id,
            userId: assigneeUid,
            assignedTo: assigneeUid,
            managerUid,
            companyId: (prospectData.companyId as string) ?? (prospectData.id as string) ?? prospectId,
            companyName,
            companySector: (prospectData.companySector as string) ?? (prospectData.sector as string) ?? null,
            companyCity: (prospectData.companyCity as string) ?? (prospectData.city as string) ?? null,
            companyPhone: (prospectData.companyPhone as string) ?? (prospectData.phone as string) ?? null,
            companyEmail: (prospectData.companyEmail as string) ?? (prospectData.email as string) ?? null,
            status: 'prospection',
            notes: (prospectData.notes as string) ?? null,
            nextFollowUp: (prospectData.nextFollowUp as string) ?? null,
            sourceId: prospectId,
            assignedBy: managerUid,
            assignedByName: managerName,
            assignmentId: assignDoc.id,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          })

          repaired++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`Erreur pour prospect ${prospectId}: ${msg}`)
        }
      }
    }

    // ── Phase 2: Patch pipeline items with ID-like companyName ────────────
    // A Firestore auto-ID is 20 chars, no spaces, alphanumeric only
    const isFirestoreId = (s: string) => /^[A-Za-z0-9]{15,25}$/.test(s)

    const memberPipelineSnap = await adminDb
      .collection('pipeline')
      .where('managerUid', '==', managerUid)
      .get()

    for (const doc of memberPipelineSnap.docs) {
      const d = doc.data()
      const currentName: string = d.companyName ?? ''
      const sourceId: string = d.sourceId ?? ''

      if (!isFirestoreId(currentName) || !sourceId) continue

      try {
        const prospectData = await resolveProspect(adminDb, sourceId)
        if (!prospectData) continue

        const realName = extractName(prospectData)
        if (realName === 'Inconnu' || realName === currentName) continue

        await doc.ref.update({
          companyName: realName,
          companySector: (prospectData.companySector as string) ?? (prospectData.sector as string) ?? d.companySector ?? null,
          companyCity: (prospectData.companyCity as string) ?? (prospectData.city as string) ?? d.companyCity ?? null,
          companyPhone: (prospectData.companyPhone as string) ?? (prospectData.phone as string) ?? d.companyPhone ?? null,
          companyEmail: (prospectData.companyEmail as string) ?? (prospectData.email as string) ?? d.companyEmail ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        })

        patched++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Patch échoué pour ${doc.id}: ${msg}`)
      }
    }

    return NextResponse.json({ repaired, patched, skipped, errors })
  } catch (error) {
    console.error('[team/assignments/repair POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
