import { admin, adminDb } from '../../firebase/admin'

type CreateAssignmentInput = {
  managerUid: string
  managerName?: string
  assigneeId: string
  assigneeUid?: string
  prospectIds: string[]
  note?: string
}

export const assignmentsService = {
  async create(input: CreateAssignmentInput) {
    const ref = adminDb.collection('assignments').doc()

    await ref.set({
      managerUid: input.managerUid,
      managerName: input.managerName ?? null,
      assigneeId: input.assigneeId,
      assigneeUid: input.assigneeUid ?? null,
      prospectIds: input.prospectIds,
      note: input.note ?? '',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    return {
      id: ref.id,
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