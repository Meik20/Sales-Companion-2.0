import { admin, adminDb } from '../../firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

type CreateAssignmentInput = {
  managerUid: string
  managerName?: string
  assigneeId: string
  prospectIds: string[]
  note?: string
}

export const assignmentsService = {
  async create(input: CreateAssignmentInput) {
    // ── Step 1: Fetch assigned member's UID from team_accesses
    const lowerId = input.assigneeId.trim().toLowerCase()
    let memberAccessDoc = await adminDb.collection('team_accesses').doc(lowerId).get()

    if (!memberAccessDoc.exists) {
      // Try exact casing lookup for legacy support
      memberAccessDoc = await adminDb.collection('team_accesses').doc(input.assigneeId).get()
    }

    if (!memberAccessDoc.exists) {
      throw new Error('Member not found')
    }

    const memberAccessData = memberAccessDoc.data()

    if (!memberAccessData || memberAccessData.managerUid !== input.managerUid) {
      throw new Error('Member access document not found or unauthorized')
    }

    const assigneeUid = memberAccessData.firebaseUid
    const assigneeAccessId = memberAccessDoc.id

    if (!assigneeUid) {
      throw new Error('Member has not activated yet')
    }

    // ── Step 2: Create assignment document
    const assignmentRef = adminDb.collection('assignments').doc()
    await assignmentRef.set({
      managerUid: input.managerUid,
      managerName: input.managerName ?? null,
      assigneeId: input.assigneeId,
      assigneeUid: assigneeUid,
      prospectIds: input.prospectIds,
      note: input.note ?? '',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    // ── Step 3: For each prospect, copy it to the assignee's pipeline
    for (const prospectId of input.prospectIds) {
      // Try pipeline first, then imported_prospects (CSV imports)
      let prospectData: Record<string, unknown> | undefined

      const pipelineDoc = await adminDb.collection('pipeline').doc(prospectId).get()
      if (pipelineDoc.exists) {
        prospectData = pipelineDoc.data()
      } else {
        // Primary CSV import collection
        const managerProspectDoc = await adminDb
          .collection('manager_prospects')
          .doc(prospectId)
          .get()
        if (managerProspectDoc.exists) {
          prospectData = managerProspectDoc.data()
        } else {
          // Legacy import collection
          const importedDoc = await adminDb.collection('imported_prospects').doc(prospectId).get()
          if (importedDoc.exists) {
            prospectData = importedDoc.data()
          }
        }
      }

      if (!prospectData) {
        console.warn(
          `Prospect ${prospectId} not found in pipeline, manager_prospects or imported_prospects — skipping`
        )
        continue
      }

      // Create copy in assignee's pipeline
      const newPipelineRef = adminDb.collection('pipeline').doc()
      await newPipelineRef.set({
        id: newPipelineRef.id,
        userId: assigneeUid,
        assignedTo: assigneeUid,
        managerUid: input.managerUid,
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
        assignedBy: input.managerUid,
        assignedByName: input.managerName ?? null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
    }

    // ── Step 4: Mark member as activated in team_accesses
    await adminDb.collection('team_accesses').doc(assigneeAccessId).update({
      activated: true,
      activatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    return {
      id: assignmentRef.id,
      created: true
    }
  },

  async listByManager(managerUid: string) {
    const snapshot = await adminDb
      .collection('assignments')
      .where('managerUid', '==', managerUid)
      .get()

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
  }
}
