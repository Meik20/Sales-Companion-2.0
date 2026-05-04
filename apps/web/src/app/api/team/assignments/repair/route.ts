import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * POST /api/team/assignments/repair
 *
 * Repairs existing assignments in Firestore that never created a pipeline item
 * for the member. Iterates all 'assignments' docs for the manager and for each
 * prospect not already in the member's pipeline, creates the missing entry.
 *
 * Returns: { repaired: number, skipped: number, errors: string[] }
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

    // Get all legacy assignments for this manager
    const assignmentsSnap = await adminDb
      .collection('assignments')
      .where('managerUid', '==', managerUid)
      .get()

    let repaired = 0
    let skipped = 0
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
          const existingSnap = await adminDb
            .collection('pipeline')
            .where('assignedTo', '==', assigneeUid)
            .where('sourceId', '==', prospectId)
            .limit(1)
            .get()

          if (!existingSnap.empty) {
            skipped++
            continue
          }

          // Also check by userId + sourceId to avoid duplicates
          const existingSnap2 = await adminDb
            .collection('pipeline')
            .where('userId', '==', assigneeUid)
            .where('sourceId', '==', prospectId)
            .limit(1)
            .get()

          if (!existingSnap2.empty) {
            skipped++
            continue
          }

          // Resolve prospect data: try pipeline first, then imported_prospects
          let prospectData: Record<string, unknown> | undefined

          const pipelineDoc = await adminDb.collection('pipeline').doc(prospectId).get()
          if (pipelineDoc.exists) {
            prospectData = pipelineDoc.data()
          } else {
            const importedDoc = await adminDb.collection('imported_prospects').doc(prospectId).get()
            if (importedDoc.exists) {
              prospectData = importedDoc.data()
            }
          }

          if (!prospectData) {
            errors.push(`Prospect ${prospectId} introuvable`)
            skipped++
            continue
          }

          // Create the missing pipeline item for the member
          const newRef = adminDb.collection('pipeline').doc()
          await newRef.set({
            id: newRef.id,
            userId: assigneeUid,
            assignedTo: assigneeUid,
            managerUid,
            companyId: prospectData.companyId ?? prospectData.id ?? null,
            companyName: prospectData.companyName ?? prospectData.name ?? 'Inconnu',
            companySector: prospectData.companySector ?? prospectData.sector ?? null,
            companyCity: prospectData.companyCity ?? prospectData.city ?? null,
            companyPhone: prospectData.companyPhone ?? prospectData.phone ?? null,
            companyEmail: prospectData.companyEmail ?? prospectData.email ?? null,
            status: 'prospection',
            notes: prospectData.notes ?? null,
            nextFollowUp: prospectData.nextFollowUp ?? null,
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

    return NextResponse.json({ repaired, skipped, errors })
  } catch (error) {
    console.error('[team/assignments/repair POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
