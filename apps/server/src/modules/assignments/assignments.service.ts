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
    const memberAccessSnapshot = await adminDb
      .collection('team_accesses')
      .where('accessId', '==', input.assigneeId)
      .where('managerUid', '==', input.managerUid)
      .limit(1)
      .get()

    if (memberAccessSnapshot.empty) {
      throw new Error('Member not found')
    }

    const memberAccessDoc = memberAccessSnapshot.docs[0]
    
    if (!memberAccessDoc) {
      throw new Error('Member access document not found')
    }
    
    const memberAccessData = memberAccessDoc.data()
    
    if (!memberAccessData) {
      throw new Error('Invalid member access document')
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
      const prospectSnapshot = await adminDb
        .collection('pipeline')
        .doc(prospectId)
        .get()

      if (prospectSnapshot.exists) {
        const prospectData = prospectSnapshot.data()
        
        if (!prospectData) {
          console.warn(`Prospect ${prospectId} exists but has no data`)
          continue
        }
        
        // Create copy in assignee's pipeline
        const newPipelineRef = adminDb.collection('pipeline').doc()
        await newPipelineRef.set({
          id: newPipelineRef.id,
          userId: assigneeUid,
          assignedTo: assigneeUid,
          managerUid: input.managerUid,
          companyId: prospectData.companyId || null,
          companyName: prospectData.companyName || 'Unknown',
          companySector: prospectData.companySector || null,
          companyCity: prospectData.companyCity || null,
          companyPhone: prospectData.companyPhone || null,
          companyEmail: prospectData.companyEmail || null,
          status: 'prospection',
          notes: prospectData.notes || null,
          nextFollowUp: prospectData.nextFollowUp || null,
          sourceId: prospectId, // Reference to original prospect
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      }
    }

    // ── Step 4: Mark member as activated in team_accesses
    await adminDb
      .collection('team_accesses')
      .doc(assigneeAccessId)
      .update({
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