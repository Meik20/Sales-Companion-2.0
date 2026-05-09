export const dynamic = 'force-dynamic';
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

    const [teamSnap, legacySnap] = await Promise.all([
      adminDb.collection('team_assignments').where('managerUid', '==', managerUid).get(),
      adminDb.collection('assignments').where('managerUid', '==', managerUid).get(),
    ])

    const teamItems = teamSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    }))

    // Enrich legacy assignments: resolve companyName from pipeline + member info from team_accesses
    const legacyItemsRaw = legacySnap.docs.filter((doc) => doc.data().status !== 'done')

    const legacyItems = await Promise.all(
      legacyItemsRaw.map(async (doc) => {
        const data = doc.data()
        const prospectIds: string[] = Array.isArray(data.prospectIds) ? data.prospectIds : []
        const firstProspectId = prospectIds[0] ?? ''
        const count = prospectIds.length

        // Resolve company name: try pipeline → manager_prospects → imported_prospects
        let companyName = count > 1 ? `${count} prospects` : firstProspectId
        if (firstProspectId) {
          try {
            const pDoc = await adminDb.collection('pipeline').doc(firstProspectId).get()
            if (pDoc.exists) {
              const pd = pDoc.data()!
              companyName = pd.companyName ?? pd.name ?? companyName
            } else {
              // Primary CSV import collection
              const mDoc = await adminDb.collection('manager_prospects').doc(firstProspectId).get()
              if (mDoc.exists) {
                const md = mDoc.data()!
                companyName = md.name ?? md.companyName ?? companyName
              } else {
                // Legacy import collection
                const iDoc = await adminDb.collection('imported_prospects').doc(firstProspectId).get()
                if (iDoc.exists) {
                  const id = iDoc.data()!
                  companyName = id.name ?? id.companyName ?? companyName
                }
              }
            }
          } catch { /* ignore */ }
        }

        // Resolve member name/email from team_accesses (legacy assigneeId = accessId)
        const assigneeId: string = data.assigneeId ?? ''
        let memberName = ''
        let memberEmail = ''
        let memberUid = data.assigneeUid ?? ''
        if (assigneeId) {
          try {
            const aDoc = await adminDb.collection('team_accesses').doc(assigneeId).get()
            if (aDoc.exists) {
              const ad = aDoc.data()!
              memberName = `${ad.firstname ?? ''} ${ad.lastname ?? ''}`.trim()
              memberEmail = ad.email ?? ''
              memberUid = ad.firebaseUid ?? memberUid
            }
          } catch { /* ignore */ }
        }

        return {
          id: doc.id,
          managerUid: data.managerUid ?? managerUid,
          managerName: data.managerName ?? '',
          memberId: memberUid || assigneeId,
          memberName,
          memberEmail,
          pipelineItemId: firstProspectId,
          pipelineEntryId: '',
          companyName,
          status: 'active' as const,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        }
      })
    )

    const items = [...teamItems, ...legacyItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // ⚠️ Wrap in { items } — useTeamAssignments reads json.items
    return NextResponse.json({ items })
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
      companyName?: string
    }
    const { pipelineItemId, memberId, companyName: providedName } = body

    if (!pipelineItemId || !memberId) {
      return NextResponse.json({ message: 'pipelineItemId et memberId requis' }, { status: 400 })
    }

    // ── Step 1: Resolve prospect details ──────────────────────────────────
    // Try provided name first, then look up in collections
    let companyName = providedName || pipelineItemId
    let prospectData: Record<string, unknown> = {}

    if (!providedName) {
      const pipelineDoc = await adminDb.collection('pipeline').doc(pipelineItemId).get()
      if (pipelineDoc.exists) {
        const d = pipelineDoc.data()!
        companyName = d.companyName || d.name || pipelineItemId
        prospectData = d
      } else {
        // Look in companies first
        const companyDoc = await adminDb.collection('companies').doc(pipelineItemId).get()
        if (companyDoc.exists) {
          const d = companyDoc.data()!
          companyName = d.raisonSociale || d.name || pipelineItemId
          prospectData = d
        } else {
          // Primary CSV import collection
          const managerProspectDoc = await adminDb.collection('manager_prospects').doc(pipelineItemId).get()
          if (managerProspectDoc.exists) {
            const d = managerProspectDoc.data()!
            companyName = d.name || d.companyName || d.raisonSociale || pipelineItemId
            prospectData = d
          } else {
            // Legacy import collection
            const importedDoc = await adminDb.collection('imported_prospects').doc(pipelineItemId).get()
            if (importedDoc.exists) {
              const d = importedDoc.data()!
              companyName = d.name || d.companyName || pipelineItemId
              prospectData = d
            }
          }
        }
      }
    } else {
      // If name provided, still try to fetch extra data (like email, phone) if possible
      const pDoc = await adminDb.collection('pipeline').doc(pipelineItemId).get()
      const cDoc = !pDoc.exists ? await adminDb.collection('companies').doc(pipelineItemId).get() : null
      const mDoc = (!pDoc.exists && !cDoc?.exists) ? await adminDb.collection('manager_prospects').doc(pipelineItemId).get() : null
      const iDoc = (!pDoc.exists && !cDoc?.exists && !mDoc?.exists) ? await adminDb.collection('imported_prospects').doc(pipelineItemId).get() : null
      
      const foundDoc = pDoc.exists ? pDoc : (cDoc?.exists ? cDoc : (mDoc?.exists ? mDoc : (iDoc?.exists ? iDoc : null)))
      if (foundDoc) prospectData = foundDoc.data()!
    }

    // ── Step 2: Get member info ────────────────────────────────────────────
    const memberDoc = await adminDb.collection('users').doc(memberId).get()
    const memberData = memberDoc.data() || {}
    const memberName  = memberData.name  ?? memberData.email ?? memberId
    const memberEmail = memberData.email ?? ''
    const memberAccessId = memberData.accessId ?? null

    // ── Step 3: Create pipeline item owned by the MEMBER ──────────────────
    // This makes it visible in the member's own Pipeline tab
    // AND in the manager's consolidated view (/api/pipeline/manager)
    const pipelineRef = adminDb.collection('pipeline').doc()
    await pipelineRef.set({
      // Preserve all original prospect fields except those explicitly overridden
      ...Object.fromEntries(
        Object.entries(prospectData).filter(([k]) =>
          !['userId', 'managerUid', 'createdAt', 'updatedAt', 'status', 'assignedTo', 'memberName', 'memberAccessId', 'assignedBy', 'assignedByName', 'id', 'sourceProspectId'].includes(k)
        )
      ),
      companyPhone: prospectData.companyPhone || prospectData.telephone || prospectData.phone || prospectData.tel || null,
      companyEmail: prospectData.companyEmail || prospectData.email || prospectData.mail || null,
      companySector: prospectData.companySector || prospectData.sector || prospectData.secteur || prospectData.activite || null,
      companyCity: prospectData.companyCity || prospectData.city || prospectData.ville || prospectData.region || null,
      userId:      memberId,          // member sees it in their pipeline
      assignedTo:  memberId,          // explicit assignment metadata
      memberName:  memberName,
      memberAccessId: memberAccessId,
      managerUid,                     // manager sees it via /api/pipeline/manager
      companyName,
      name:        companyName,
      status:      'prospection',
      assignedBy:  managerUid,
      assignedByName: managerName,
      sourceProspectId: pipelineItemId,
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
