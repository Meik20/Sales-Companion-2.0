import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'

async function getAdmin() {
  const { adminDb, adminAuth } = await import('@/lib/firebase-admin')
  return { adminDb, adminAuth }
}

/**
 * GET /api/team/assignments
 * Returns all assignments created by the authenticated manager.
 */
export async function GET(request: NextRequest) {
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

    const snap = await adminDb
      .collection('team_assignments')
      .where('managerUid', '==', managerUid)
      .get()

    const items = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json(items)
  } catch (error) {
    console.error('[team/assignments GET]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/team/assignments
 *
 * Body: { pipelineItemId: string, memberId: string }
 *
 * This endpoint:
 *  1. Looks up the pipeline item (or imported prospect) to get its details
 *  2. Creates a record in `team_assignments` (shown in "Assignations actives")
 *  3. Creates a pipeline item owned by the member (shown in their Pipeline tab)
 *     with `managerUid` set so the manager can see it too via /api/pipeline/manager
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
      // Try to get manager name
      const managerDoc = await adminDb.collection('users').doc(managerUid).get()
      managerName = managerDoc.data()?.name ?? managerDoc.data()?.email ?? ''
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as {
      pipelineItemId?: string
      memberId?: string
    }
    const { pipelineItemId, memberId } = body

    if (!pipelineItemId || !memberId) {
      return NextResponse.json({ message: 'pipelineItemId et memberId requis' }, { status: 400 })
    }

    // ── Step 1: Resolve prospect details ──────────────────────────────────
    // Try pipeline collection first, then imported prospects
    let companyName = pipelineItemId
    let prospectData: Record<string, unknown> = {}

    const pipelineDoc = await adminDb.collection('pipeline').doc(pipelineItemId).get()
    if (pipelineDoc.exists) {
      const d = pipelineDoc.data()!
      companyName = d.companyName ?? d.name ?? pipelineItemId
      prospectData = d
    } else {
      // Try imported prospects
      const importedDoc = await adminDb.collection('imported_prospects').doc(pipelineItemId).get()
      if (importedDoc.exists) {
        const d = importedDoc.data()!
        companyName = d.name ?? d.companyName ?? pipelineItemId
        prospectData = d
      }
    }

    // ── Step 2: Get member info ────────────────────────────────────────────
    const memberDoc = await adminDb.collection('users').doc(memberId).get()
    const memberName  = memberDoc.data()?.name  ?? memberDoc.data()?.email ?? memberId
    const memberEmail = memberDoc.data()?.email ?? ''

    // ── Step 3: Create pipeline item owned by the MEMBER ──────────────────
    // This makes it visible in the member's own Pipeline tab
    // AND in the manager's consolidated view (/api/pipeline/manager)
    const pipelineRef = adminDb.collection('pipeline').doc()
    await pipelineRef.set({
      userId:      memberId,          // member sees it in their pipeline
      managerUid,                     // manager sees it via /api/pipeline/manager
      companyName,
      name:        companyName,
      status:      'prospect',
      assignedBy:  managerUid,
      assignedByName: managerName,
      sourceProspectId: pipelineItemId,
      // Preserve all original prospect fields
      ...Object.fromEntries(
        Object.entries(prospectData).filter(([k]) =>
          !['userId', 'managerUid', 'createdAt', 'updatedAt'].includes(k)
        )
      ),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // ── Step 4: Create assignment record ──────────────────────────────────
    // This is what "Assignations actives" reads from
    const assignmentRef = adminDb.collection('team_assignments').doc()
    await assignmentRef.set({
      managerUid,
      managerName,
      memberId,
      memberName,
      memberEmail,
      pipelineItemId,        // original prospect id
      pipelineEntryId: pipelineRef.id, // new member pipeline item
      companyName,
      status:    'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      assignmentId: assignmentRef.id,
      pipelineEntryId: pipelineRef.id,
    })
  } catch (error) {
    console.error('[team/assignments POST]', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
